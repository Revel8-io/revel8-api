import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs/promises'

import { CONFIG } from '../../../common/constants/web3'
import Atom from 'App/Models/Atom'
import Triple from 'App/Models/Triple'

const { IS_ATOMS, IS_RELEVANT_X_ATOM, HAS_RELATED_IMAGE_VAULT_ID, OWNS_X_COM_ACCOUNT_ATOM_ID, TARGET_TYPES } = CONFIG

export default class AtomsController {
  public async searchAtomsWithContentsVaults({ params, request, response }: HttpContextContract) {
    const { q, page = 1, limit = 40 } = request.qs()

    // Get sorting parameters
    const sort = request.input('sort', 'most-recent')
    const direction = request.input('direction', 'desc')
    const order = direction === 'asc' ? 'asc' : 'desc'

    // Build the query using Atom model
    const atomsQuery = Atom.query()
      .preload('atomIpfsData')
      .preload('vault')

    // Add search logic if query is provided
    if (q) {
      // Search in atomIpfsData contents (case-insensitive)
      atomsQuery.orWhereHas('atomIpfsData', (builder) => {
        builder.whereRaw("CAST(contents AS TEXT) ILIKE ?", [`%${q}%`])
      })
    }

    // Apply sorting based on sort parameter
    switch (sort) {
      case 'highest-stake':
        // For complex sorting, we need to join vault data
        atomsQuery
          .join('Vault', 'Vault.id', 'Atom.vaultId')
          .orderByRaw(`("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18)) ${order === 'asc' ? 'ASC' : 'DESC'}`)
        break

      case 'popularity':
        atomsQuery
          .join('Vault', 'Vault.id', 'Atom.vaultId')
          .orderBy('Vault.positionCount', order)
        break

      case 'alphabetical':
        atomsQuery
          .join('AtomIpfsData', 'AtomIpfsData.atomId', 'Atom.id')
          .orderByRaw(`AtomIpfsData.contents->>'name' ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`)
        break

      case 'most-recent':
      default:
        atomsQuery.orderBy('blockTimestamp', order)
        break
    }

    // Execute query with pagination
    const atoms = await atomsQuery.paginate(page, limit)

    return response.json(atoms)
  }

  public async show({ params, response }: HttpContextContract) {
    const { id: atomId } = params
    // Use the Atom model to include related data
    const atom = await Atom.query()
      .where('id', atomId)
      .preload('atomIpfsData')
      .preload('vault')
      .first()

    if (!atom) {
      // If not found with the model, try direct database query as fallback
      const rawAtom = await Database.query()
        .from('Atom')
        .where('Atom.id', atomId)
        .leftJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atomId')
        .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
        .select(
          'Atom.*',
          'AtomIpfsData.contents',
          'AtomIpfsData.imageFilename as imageFilename',
          'Vault.totalShares',
          'Vault.currentSharePrice',
          'Vault.positionCount'
        )
        .first()

      return response.json(rawAtom)
    }

    return response.json(atom)
  }

  /**
   * Fetches multiple atoms by their IDs, including their associated IPFS data and vault information.
   * Expects a comma-separated string of IDs in the 'ids' route parameter.
   */
  public async showMultiple({ params, response }: HttpContextContract) {
    const { ids } = params

    if (!ids) {
      return response.status(400).json({ message: 'Missing atom IDs parameter.' })
    }

    const atomIdsArray = ids.split(',').map(id => {
      const parsedId = parseInt(id.trim(), 10)
      if (isNaN(parsedId)) return response.status(400).json({ message: `Invalid atom ID '${id}' provided. IDs must be numeric.` })
      return parsedId
    })

    if (atomIdsArray.length === 0) {
      return response.json([])
    }

    try {
      const atoms = await Atom.query()
        .whereIn('id', atomIdsArray)
        .preload('atomIpfsData')
        .preload('vault')

      // Optionally, sort the results to match the input order
      const sortedAtoms = atoms.sort((a, b) => atomIdsArray.indexOf(a.id) - atomIdsArray.indexOf(b.id))

      return response.json(sortedAtoms)
    } catch (error) {
        console.error('Error fetching multiple atoms:', error)
        return response.internalServerError({ message: 'An error occurred while fetching atoms.' })
    }
  }

  public async showWithContents({ params, response }: HttpContextContract) {
    const { atomIds } = params
    const atomIdsArray = atomIds.split(',').map(Number)
    // find using Atom model
    const atoms = await Atom.query()
      .whereIn('id', atomIdsArray)
      .preload('atomIpfsData')
      .preload('vault')
    // sort in same order as atomIds
    const sortedAtoms = atoms.sort((a, b) => atomIdsArray.indexOf(a.id) - atomIdsArray.indexOf(b.id))
    return response.json(sortedAtoms)
  }


  // keep using or no? Used on Explorer Atoms page
  public async getAtomContentsWithVaults({ params, response }: HttpContextContract) {
    const { atomId } = params
    // Try using the Atom model first (better structure)
    try {
      const atom = await Atom.query()
        .where('id', atomId)
        .preload('atomIpfsData')
        .preload('vault')
        .first()
      console.log('atom', atom)
      if (atom) {
        return response.json(atom)
      }
    } catch (err) {
      console.error('Error fetching atom with model:', err)
    }

    // Fallback to direct database query with explicit column selection
    const atom = await Database.query()
      .from('Atom')
      .where('Atom.id', atomId)
      .leftJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atomId')
      .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
      .select(
        // Select Atom fields
        'Atom.id',
        'Atom.walletId',
        'Atom.creatorId',
        'Atom.vaultId',
        'Atom.data',
        'Atom.type',
        'Atom.emoji',
        'Atom.label',
        'Atom.image',
        'Atom.valueId',
        'Atom.blockNumber',
        'Atom.blockTimestamp',
        'Atom.transactionHash',
        // Select AtomIpfsData fields
        'AtomIpfsData.id as atomIpfsDataId',
        'AtomIpfsData.atomId',
        'AtomIpfsData.contents',
        'AtomIpfsData.contentsAttempts',
        'AtomIpfsData.imageAttempts',
        'AtomIpfsData.imageHash',
        'AtomIpfsData.imageFilename',
        // Select Vault fields
        'Vault.id as vaultId',
        'Vault.totalShares',
        'Vault.currentSharePrice',
        'Vault.positionCount'
      )
      .first()

    // Transform the data to match the expected structure
    const result = atom ? {
      ...atom,
      atomIpfsData: {
        id: atom.atomIpfsDataId,
        atomId: atom.atomId,
        contents: atom.contents,
        contentsAttempts: atom.contentsAttempts,
        imageAttempts: atom.imageAttempts,
        imageHash: atom.imageHash,
        imageFilename: atom.imageFilename
      },
      vault: {
        id: atom.vaultId,
        totalShares: atom.totalShares,
        currentSharePrice: atom.currentSharePrice,
        positionCount: atom.positionCount
      }
    } : null

    return response.json(result)
  }

  // public async getMostRelevantXAtoms({ response }: HttpContextContract) {
  //   const { rows } = await Database
  //     .rawQuery(`SELECT
  //           "Triple"."subjectId", "Triple"."vaultId", "Triple"."counterVaultId",
  //           "Vault"."totalShares" as "vaultTotalShares", "Vault"."currentSharePrice" as "vaultCurrentSharePrice", "Vault"."atomId" as "vaultAtomId", "Vault"."tripleId" as "vaultTripleId", "Vault"."positionCount" as "vaultPositionCount",
  //           "counterVault"."totalShares" as "counterVaultTotalShares", "counterVault"."currentSharePrice" as "counterVaultCurrentSharePrice", "counterVault"."atomId" as "counterVaultAtomId", "counterVault"."tripleId" as "counterVaultTripleId", "counterVault"."positionCount" as "counterVaultPositionCount",
  //           AtomIpfsData.contents as "contents", AtomIpfsData.imageFilename as "imageFilename"
  //           FROM
  //               "Triple"
  //           JOIN
  //               "Vault"
  //           ON
  //               "Triple"."vaultId" = "Vault".id
  //           JOIN
  //             "Vault" AS "counterVault"
  //           ON
  //             "Triple"."counterVaultId" = "counterVault"."id"
  //           LEFT JOIN "AtomIpfsData"
  //           ON "Triple"."subjectId" = "AtomIpfsData"."atomId"
  //           WHERE AtomIpfsData.contents <> '{}'
  //           AND
  //               "Triple"."predicateId" IN (${IS_ATOMS.map(item=> "'" + item + "'").join(',')})
  //               AND "Triple"."objectId" = '${IS_RELEVANT_X_ATOM}'
  //           ORDER BY
  //             GREATEST (
  //               (("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC) / POWER(10, 18)),
  //               (("counterVault"."totalShares"::NUMERIC / POWER(10, 18)) * ("counterVault"."currentSharePrice"::NUMERIC) / POWER(10, 18))
  //             )
  //           DESC LIMIT 20;`)
  //   return response.json(rows)
  // }

  // not actually being used right now
  public async getRelevantAtomsByQueryString({ request, response }: HttpContextContract) {
    const { fullQuery: fullQuery, limit = 10 } = request.qs()
    const [fullType, queryTerm] = fullQuery.split('|')

    console.log('getRelevantAtomsByQueryString', {
      fullQuery,
      fullType,
      queryTerm,
    })
    // will also need to consider counterVault data
    const relevantPredicate = TARGET_TYPES[fullType]
    let atoms = []
    if (relevantPredicate) {
      atoms = await getRelevantAtomsViaPredicate(relevantPredicate, queryTerm, limit)
    } else {
      // do something url = name, description, url
      switch (fullType) {
        case 'url':
          atoms = await getRelevantAtomsViaUrl(queryTerm, limit)
          break
        case 'evmAddress':
          atoms = await getRelevantAtomsViaEvmAddress(queryTerm, limit)
          break
      }
      // address = name, address, description
    }
    return response.json(atoms)
  }

  public async getRelevantImages({ params, response }: HttpContextContract) {
    const { atomId } = params
    console.log('atomId', atomId)
    console.log('HAS_RELATED_IMAGE_VAULT_ID', HAS_RELATED_IMAGE_VAULT_ID)
    // get all triples with predicateId that matches HAS_RELATED_IMAGE_VAULT_ID
    // and whose subjectId matches atomId
    const triples = await Triple.query()
      .where('predicateId', HAS_RELATED_IMAGE_VAULT_ID)
      .where('subjectId', atomId)
      .preload('vault')
      .preload('object', (query) => {
        query.preload('atomIpfsData')
      })
      // Join the Vault table to use its columns in ordering
      .join('Vault', 'Triple.vaultId', 'Vault.id')
      .orderByRaw('("Vault"."totalShares" / POWER(10, 18)) * ("Vault"."currentSharePrice" / POWER(10, 18)) DESC')
    return response.json(triples)
  }

  public async generateJSONData({ response }: HttpContextContract) {
    const { rows } = await Database.rawQuery(`SELECT * FROM "AtomIpfsData"`)
    // write to file
    await fs.writeFile('atomIpfsData.json', JSON.stringify(rows, null, 2))
    return response.status(200)
  }
}
const getRelevantAtomsViaPredicate = async (relevantPredicate: string, queryTerm: string, limit: number) => {
  const triples = await Triple.query()
    .where('predicateId', relevantPredicate)
    .preload('object', (query) => {
      query.preload('atomIpfsData')
    })
    .preload('subject', (query) => {
      query.preload('atomIpfsData')
    })
    .preload('predicate', (query) => {
      query.preload('atomIpfsData')
    })
    .preload('vault') // Preload the vault to access its properties
    .whereHas('object', (query) => {
      query.whereHas('atomIpfsData', (ipfsQuery) => {
        ipfsQuery.whereRaw("contents->>'name' = ?", [queryTerm])
      })
    })
    // Use raw SQL to calculate the product and order by it
    .orderByRaw('(SELECT "totalShares"::numeric * "currentSharePrice"::numeric FROM "Vault" WHERE "Vault"."id" = "Triple"."vaultId") DESC')
    .limit(limit)

  console.log('triples', triples)
  // from those triples, get a list of unique subjectIds and objectIds
  // but prevent duplicates
  const uniqueSubjectIds = [...new Set(triples.map(triple => triple.subjectId))]
  const uniqueObjectIds = [...new Set(triples.map(triple => triple.objectId))]

  // now join those two but prevent duplicates
  const uniqueIds = [...new Set([...uniqueSubjectIds, ...uniqueObjectIds])]

  // get the atoms for the uniqueIds and their vaults and sort by atomVault currentSharePrice * totalShares
  const atoms = await Atom.query()
    .whereIn('id', uniqueIds)
    .preload('vault') // Directly preload the vault relationship
    .preload('atomIpfsData')
    .orderByRaw('(SELECT "totalShares"::numeric * "currentSharePrice"::numeric FROM "Vault" WHERE "Vault"."atomId" = "Atom"."id") DESC')

  return atoms
}

const getRelevantAtomsViaUrl = async (queryTerm: string, limit: number) => {
  console.log('getRelevantAtomsViaUrl', queryTerm)
  const atoms = await Atom.query()
    .whereHas('atomIpfsData', (builder) => {
      builder.whereRaw("contents->>'url' = ?", [queryTerm])
    })
    .preload('vault')
    .preload('atomIpfsData')
    .orderByRaw('(SELECT "totalShares"::numeric * "currentSharePrice"::numeric FROM "Vault" WHERE "Vault"."atomId" = "Atom"."id") DESC')
    .limit(limit)
  return atoms
}

const getRelevantAtomsViaEvmAddress = async (queryTerm: string, limit: number) => {
  const atoms = await Atom.query()
    .whereHas('atomIpfsData', (builder) => {
      builder.whereRaw("contents->>'name' ILIKE ?", [`%${queryTerm}%`])
    })
    .orWhere('data', 'like', `%${queryTerm}%`)
    .preload('vault')
    .preload('atomIpfsData')
    .orderByRaw('(SELECT "totalShares"::numeric * "currentSharePrice"::numeric FROM "Vault" WHERE "Vault"."atomId" = "Atom"."id") DESC')
  console.log('atoms.length', atoms.length)
  return atoms
}
