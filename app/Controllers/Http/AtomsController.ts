import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs/promises'

import { CONFIG } from '../../../util/'

const { IS_ATOMS, IS_RELEVANT_X_ATOM } = CONFIG

export default class AtomsController {
  public async show({ params, response }: HttpContextContract) {
    const { id: atomId } = params
    const atom = await Database.query().from('Atom').where('id', atomId).first()
    return response.json(atom)
  }

  public async showWithContents({ params, response }: HttpContextContract) {
    const { id: atomId } = params
    const atom = await Database.query()
      .from('Atom')
      .where('Atom.id', atomId)
      .leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
      .first()
    return response.json(atom)
  }

  public async getMostRelevantXAtoms({ response }: HttpContextContract) {
    const { rows } = await Database
      .rawQuery(`SELECT
            "Triple"."subjectId", "Triple"."vaultId", "Triple"."counterVaultId",
            "Vault"."totalShares" as "vaultTotalShares", "Vault"."currentSharePrice" as "vaultCurrentSharePrice", "Vault"."atomId" as "vaultAtomId", "Vault"."tripleId" as "vaultTripleId", "Vault"."positionCount" as "vaultPositionCount",
            "counterVault"."totalShares" as "counterVaultTotalShares", "counterVault"."currentSharePrice" as "counterVaultCurrentSharePrice", "counterVault"."atomId" as "counterVaultAtomId", "counterVault"."tripleId" as "counterVaultTripleId", "counterVault"."positionCount" as "counterVaultPositionCount",
            atom_ipfs_data.contents as "contents"
            FROM
                "Triple"
            JOIN
                "Vault"
            ON
                "Triple"."vaultId" = "Vault".id
            JOIN
              "Vault" AS "counterVault"
            ON
              "Triple"."counterVaultId" = "counterVault"."id"
            LEFT JOIN "atom_ipfs_data"
            ON "Triple"."subjectId" = "atom_ipfs_data"."atom_id"
            WHERE atom_ipfs_data.contents <> '{}'
            AND
                "Triple"."predicateId" IN (${IS_ATOMS.map(item=> "'" + item + "'").join(',')})
                AND "Triple"."objectId" = '${IS_RELEVANT_X_ATOM}'
            ORDER BY
              GREATEST (
                (("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC) / POWER(10, 18)),
                (("counterVault"."totalShares"::NUMERIC / POWER(10, 18)) * ("counterVault"."currentSharePrice"::NUMERIC) / POWER(10, 18))
              )
            DESC LIMIT 20;`)
    return response.json(rows)
  }

  public async getMostRelevantXAtomsWithContents({ response }: HttpContextContract) {
    const { rows } = await Database
      .rawQuery(`SELECT
            "Triple"."subjectId", "Triple"."vaultId", "Triple"."counterVaultId",
            "Vault"."totalShares" as "vaultTotalShares", "Vault"."currentSharePrice" as "vaultCurrentSharePrice", "Vault"."atomId" as "vaultAtomId", "Vault"."tripleId" as "vaultTripleId", "Vault"."positionCount" as "vaultPositionCount",
            "counterVault"."totalShares" as "counterVaultTotalShares", "counterVault"."currentSharePrice" as "counterVaultCurrentSharePrice", "counterVault"."atomId" as "counterVaultAtomId", "counterVault"."tripleId" as "counterVaultTripleId", "counterVault"."positionCount" as "counterVaultPositionCount",
            atom_ipfs_data.contents as "contents"
            FROM
                "Triple"
            JOIN
                "Vault"
            ON
                "Triple"."vaultId" = "Vault".id
            JOIN
              "Vault" AS "counterVault"
            ON
              "Triple"."counterVaultId" = "counterVault"."id"
            LEFT JOIN "atom_ipfs_data"
            ON "Triple"."subjectId" = "atom_ipfs_data"."atom_id"
            WHERE atom_ipfs_data.contents <> '{}'
            AND
                "Triple"."predicateId" IN (${IS_ATOMS.map(item=> "'" + item + "'").join(',')})
                AND "Triple"."objectId" = '${IS_RELEVANT_X_ATOM}'
            ORDER BY
              GREATEST (
                (("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC) / POWER(10, 18)),
                (("counterVault"."totalShares"::NUMERIC / POWER(10, 18)) * ("counterVault"."currentSharePrice"::NUMERIC) / POWER(10, 18))
              )
            DESC LIMIT 20;`)
    return response.json(rows)
  }

  public async getXUserAtom({ request, response }: HttpContextContract) {
    const { username } = request.all()
    // get atom_ipfs_data where contents.xUsername = username
    // then join Atom table on atom_id
    const rows = await Database.query()
      .from('atom_ipfs_data')
      .whereRaw('contents @> ?::jsonb', [JSON.stringify({ xUsername: username })])
      .join('Atom', 'atom_ipfs_data.atom_id', 'Atom.id')
      .join('Vault', 'Vault.id', 'Atom.vaultId')
      .select(
        'atom_ipfs_data.*',
        'Vault.totalShares',
        'Vault.currentSharePrice',
        'Vault.positionCount',
        'Atom.blockNumber',
        'Atom.blockTimestamp',
        'Atom.vaultId',
        'Atom.creatorId'
      )
      .orderByRaw('("Vault"."totalShares" / POWER(10, 18)) * ("Vault"."currentSharePrice" / POWER(10, 18)) DESC')
    console.log(`getXUserAtom for ${username} rows.length`, rows.length)
    return response.json(rows)
  }

  public async generateJSONData({ response }: HttpContextContract) {
    const { rows } = await Database.rawQuery(`SELECT * FROM "atom_ipfs_data"`)
    // write to file
    await fs.writeFile('atomIpfsData.json', JSON.stringify(rows, null, 2))
    return response.status(200)
  }
}

