import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'

import { CONFIG } from '../../../util/'

const { IS_ATOM, IS_RELEVANT_X_ATOM } = CONFIG

export default class AtomsController {

  public async getMostRelevantXAtoms({ response }: HttpContextContract) {
    const { rows } = await Database
      .rawQuery(`SELECT
            "Triple"."subjectId", "Triple"."vaultId", "Triple"."counterVaultId",
            "Vault"."totalShares" as "vaultTotalShares", "Vault"."currentSharePrice" as "vaultCurrentSharePrice", "Vault"."atomId" as "vaultAtomId", "Vault"."tripleId" as "vaultTripleId", "Vault"."positionCount" as "vaultPositionCount",
            "counterVault"."totalShares" as "counterVaultTotalShares", "counterVault"."currentSharePrice" as "counterVaultCurrentSharePrice", "counterVault"."atomId" as "counterVaultAtomId", "counterVault"."tripleId" as "counterVaultTripleId", "counterVault"."positionCount" as "counterVaultPositionCount",
            atom_ipfs_data.contents as "atomContents"
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
            WHERE
                "Triple"."predicateId" = '${CONFIG.IS_ATOM}'
                AND "Triple"."objectId" = '${CONFIG.IS_RELEVANT_X_ATOM}'
            ORDER BY
              GREATEST (
                (("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC) / POWER(10, 18)),
                (("counterVault"."totalShares"::NUMERIC / POWER(10, 18)) * ("counterVault"."currentSharePrice"::NUMERIC) / POWER(10, 18))
              )
            DESC LIMIT 20;`)
    console.log('rows', rows)
    // const relevantAtomIds = []
    // rows.forEach((row) => {
    //   relevantAtomIds.push(row.subjectId)
    // })

    // // console.log('relevantAtomIds', relevantAtomIds)
    // const atomsData = await Database.query().from('atom_ipfs_data').whereIn('atom_id', relevantAtomIds)
    // console.log('atomsData', atomsData)
    return response.json(rows)
  }
}

