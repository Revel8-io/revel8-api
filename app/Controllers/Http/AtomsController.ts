import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Redis from '@ioc:Adonis/Addons/Redis'
import fs from 'fs/promises'

import { CONFIG } from '../../../common/constants/web3'
import Atom from 'App/Models/Atom'
import { xApiAuth } from './TwitterController'
import Triple from 'App/Models/Triple'

const { IS_ATOMS, IS_RELEVANT_X_ATOM, HAS_RELATED_IMAGE_VAULT_ID, OWNS_X_COM_ACCOUNT_ATOM_ID, TARGET_TYPES } = CONFIG

export default class AtomsController {
  public async index({ request, response }: HttpContextContract) {
    // Parse pagination and sorting parameters with safe defaults
    let page = 1;
    let perPage = 20;
    try {
      page = parseInt(request.qs().page || '1')
      if (isNaN(page) || page < 1) page = 1

      perPage = parseInt(request.qs().perPage || '20')
      if (isNaN(perPage) || perPage < 1) perPage = 20
    } catch (error) {
      console.error('Pagination parameter error:', error)
    }

    // Get sorting parameters - prioritize 'sort' special case
    const sort = request.qs().sort

    // Only use orderBy/direction as fallback if sort is not specified
    let orderBy = request.qs().orderBy || 'blockTimestamp'
    const direction = request.qs().direction || 'desc'
    const order = direction === 'asc' ? 'asc' : 'desc'

    // Determine sorting method based on sort parameter first
    let sortByVaultValue = false
    let sortByPositionCount = false
    let sortByAlphabetical = false
    let sortByMostRecent = true // Default

    // If sort parameter is provided, it takes precedence
    if (sort) {
      // Reset default sorting
      sortByMostRecent = false

      switch (sort) {
        case 'most-recent':
          sortByMostRecent = true
          break
        case 'highest-stake':
          sortByVaultValue = true
          break
        case 'popularity':
          sortByPositionCount = true
          break
        case 'alphabetical':
          sortByAlphabetical = true
          break
        default:
          // If sort is not one of our special cases, fall back to default
          sortByMostRecent = true
      }
    } else {
      // Sort parameter not provided, determine sorting method from orderBy (legacy behavior)
      // Check legacy orderBy values if needed
      sortByVaultValue = request.qs().sortByVaultValue === 'true' || orderBy === 'vault.totalShares' // Adjust legacy check if needed
      sortByPositionCount = orderBy === 'positionCount' || orderBy === 'vault.positionCount'
      sortByAlphabetical = orderBy === 'atomIpfsData.contents>>name'
      // Determine if most recent based on other flags
      sortByMostRecent = !sortByVaultValue && !sortByPositionCount && !sortByAlphabetical
    }

    const query = Atom.query()
      .preload('atomIpfsData')
      .preload('vault')
      .where((builder) => {
        builder.where('data', 'like', '0x%');
        builder.orWhereHas('atomIpfsData', (ipfsBuilder) => {
          ipfsBuilder.whereRaw("contents->>'name' IS NOT NULL AND contents->>'name' <> ''");
        });
      });

    // Conditionally join tables ONLY if needed for sorting
    // We need joins to make related table columns available for orderBy
    if (sortByVaultValue || sortByPositionCount) {
        // Use 'vaults' as alias if your table name is 'vaults' and relation is 'vault'
        // Adjust 'vaults' to your actual Vault table name if different
        query.leftJoin('Vault as Vault', 'Atom.vaultId', 'Vault.id')
    }
    if (sortByAlphabetical) {
        // Adjust 'AtomIpfsData' to your actual table name if different
        query.leftJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atomId')
    }

    // Apply the appropriate sorting
    // Note: When joining, ensure column names are unambiguous (e.g., 'Vault.positionCount')
    if (sortByVaultValue) {
      // Sort by vault value (totalShares * currentSharePrice)
      // Ensure 'Vault' alias matches the join alias
      query.orderByRaw(`("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18)) ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`)
    } else if (sortByPositionCount) {
      // Sort by position count using the joined table
      // Ensure 'Vault' alias matches the join alias
      query.orderBy('Vault.positionCount', order)
    } else if (sortByAlphabetical) {
      // Sort alphabetically by name using the joined table
      query.orderByRaw(`AtomIpfsData.contents->>'name' ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`)
    } else { // Default or sortByMostRecent
      // Sort by most recent (blockTimestamp on Atom model) - No join needed for this
      // Explicitly qualify with model table name if needed, but usually not required here
      query.orderBy('blockTimestamp', order) // Assumes 'blockTimestamp' is directly on the Atom model/table
    }

    // Execute query with pagination using Lucid's paginate method
    // Ensure page and perPage are valid numbers
    const safePerPage = Math.max(1, perPage)
    const safePage = Math.max(1, page)

    const atoms = await query.paginate(safePage, safePerPage)

    // Return the paginated result directly
    // Lucid's paginate result includes meta and data
    return response.json(atoms)
  }

  public async searchAtomsWithContentsVaults({ params, request, response }: HttpContextContract) {
    const { q } = request.qs()

    // Parse pagination and sorting parameters with safe defaults
    let page = 1;
    let perPage = 20;
    try {
      page = parseInt(request.qs().page || '1')
      if (isNaN(page) || page < 1) page = 1

      perPage = parseInt(request.qs().perPage || '20')
      if (isNaN(perPage) || perPage < 1) perPage = 20
    } catch (error) {
      console.error('Pagination parameter error:', error)
    }

    // Get sorting parameters - prioritize 'sort' special case
    const sort = request.qs().sort

    // Only use orderBy/direction as fallback if sort is not specified
    let orderBy = request.qs().orderBy || 'blockTimestamp'
    const direction = request.qs().direction || 'desc'
    const order = direction === 'asc' ? 'asc' : 'desc'

    // Determine sorting method based on sort parameter first
    let sortByVaultValue = false
    let sortByPositionCount = false
    let sortByAlphabetical = false
    let sortByMostRecent = true // Default

    // If sort parameter is provided, it takes precedence
    if (sort) {
      // Reset default sorting
      sortByMostRecent = false

      switch (sort) {
        case 'most-recent':
          sortByMostRecent = true
          break
        case 'highest-stake':
          sortByVaultValue = true
          break
        case 'popularity':
          sortByPositionCount = true
          break
        case 'alphabetical':
          sortByAlphabetical = true
          break
        default:
          // If sort is not one of our special cases, fall back to orderBy/direction
          sortByMostRecent = true
      }
    } else {
      // Sort parameter not provided, determine sorting method from orderBy (legacy behavior)
      sortByVaultValue = request.qs().sortByVaultValue === 'true' || orderBy === 'vault.totalShares'
      sortByPositionCount = orderBy === 'positionCount' || orderBy === 'vault.positionCount'
      sortByAlphabetical = orderBy === 'atomIpfsData.contents>>name'
      sortByMostRecent = !sortByVaultValue && !sortByPositionCount && !sortByAlphabetical
    }

    // If sorting by special cases, we'll need to use the custom DB query
    const needsCustomSorting = sortByVaultValue || sortByPositionCount || sortByAlphabetical

    // For standard query, only allow certain order by columns
    if (!needsCustomSorting) {
      // Restrict orderBy to valid columns for standard query
      if (!['blockTimestamp', 'id', 'creatorId'].includes(orderBy)) {
        orderBy = 'blockTimestamp'
      }
    }

    // Check if query is a number (potential atom ID)
    const isNumeric = !isNaN(Number(q)) && !isNaN(parseFloat(q))

    // Build base query
    let atomsQuery

    // If using custom sorting (either vault value or position count)
    if (needsCustomSorting) {
      // Use Database query builder for more complex joins and sorting
      atomsQuery = Database.query()
        .from('Atom')
        .leftJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atomId')
        .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
        .select(
          'Atom.*',
          'AtomIpfsData.*',
          'Vault.totalShares',
          'Vault.currentSharePrice',
          'Vault.positionCount'
        )

      if (isNumeric) {
        const atomId = parseInt(q)
        atomsQuery.where('Atom.id', atomId)
      }

      // Case-insensitive search with ILIKE
      atomsQuery.orWhereRaw("CAST(\"AtomIpfsData\".contents AS TEXT) ILIKE ?", [`%${q}%`])

      // Apply the appropriate custom sorting
      if (sortByVaultValue) {
        // Sort by vault value (totalShares * currentSharePrice)
        atomsQuery.orderByRaw(`("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18)) ${order === 'asc' ? 'ASC' : 'DESC'}`)
      } else if (sortByPositionCount) {
        // Sort by position count
        atomsQuery.orderBy('Vault.positionCount', order)
      } else if (sortByAlphabetical) {
        // Sort alphabetically by name
        atomsQuery.orderByRaw(`AtomIpfsData.contents->>'name' ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`)
      } else if (sortByMostRecent) {
        // Sort by most recent (blockTimestamp)
        atomsQuery.orderBy('Atom.blockTimestamp', order)
      }

      // Custom pagination
      const countQuery = Database.query()
        .from('Atom')
        .leftJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atomId')
        .count('* as total')

      if (isNumeric) {
        const atomId = parseInt(q)
        countQuery.where('Atom.id', atomId)
      }

      // Case-insensitive search with ILIKE
      countQuery.orWhereRaw("CAST(\"AtomIpfsData\".contents AS TEXT) ILIKE ?", [`%${q}%`])

      const countResult = await countQuery.first()
      const total = countResult ? parseInt(countResult.total as string) : 0

      // Apply pagination - ensure values are valid integers
      const safeLimit = Math.max(1, perPage)
      const safeOffset = Math.max(0, (page - 1) * safeLimit)

      atomsQuery.limit(safeLimit)
      atomsQuery.offset(safeOffset)

      // Execute query
      const atoms = await atomsQuery

      // Create pagination metadata
      const lastPage = Math.ceil(total / safeLimit) || 1

      const result = {
        meta: {
          total,
          perPage: safeLimit,
          currentPage: page,
          lastPage: lastPage,
          firstPage: 1,
          firstPageUrl: `?page=1`,
          lastPageUrl: `?page=${lastPage}`,
          nextPageUrl: page < lastPage ? `?page=${page + 1}` : null,
          previousPageUrl: page > 1 ? `?page=${page - 1}` : null,
        },
        data: atoms
      }

      return response.json(result)
    } else {
      // Use Atom model query for standard ordering
      atomsQuery = Atom.query()
        .preload('atomIpfsData')
        .preload('vault')

      if (isNumeric) {
        // Search for atom with exact ID match
        const atomId = parseInt(q)
        atomsQuery.where('id', atomId)
      }

      // Also search for atoms where atomIpfsData.contents contains the query
      // Using ILIKE for case-insensitive matching
      atomsQuery
        .orWhereHas('atomIpfsData', (builder) => {
          builder.whereRaw("CAST(\"AtomIpfsData\".contents AS TEXT) ILIKE ?", [`%${q}%`])
        })

      // Apply standard ordering
      if (orderBy === 'blockTimestamp' || orderBy === 'id' || orderBy === 'creatorId') {
        atomsQuery.orderBy(orderBy, order)
      }

      // Execute the query with pagination - ensure values are valid integers
      const atoms = await atomsQuery.paginate(page, perPage)

      return response.json(atoms)
    }
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
      return response.badRequest({ message: 'Missing atom IDs parameter.' })
    }

    const atomIdsArray = ids.split(',').map(id => parseInt(id.trim(), 10))

    // Validate IDs
    if (atomIdsArray.some(isNaN)) {
      return response.badRequest({ message: 'Invalid atom IDs provided. IDs must be numeric.' })
    }

    if (atomIdsArray.length === 0) {
        return response.json([]) // Return empty array if no valid IDs provided
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

  public async getMostRelevantXAtoms({ response }: HttpContextContract) {
    const { rows } = await Database
      .rawQuery(`SELECT
            "Triple"."subjectId", "Triple"."vaultId", "Triple"."counterVaultId",
            "Vault"."totalShares" as "vaultTotalShares", "Vault"."currentSharePrice" as "vaultCurrentSharePrice", "Vault"."atomId" as "vaultAtomId", "Vault"."tripleId" as "vaultTripleId", "Vault"."positionCount" as "vaultPositionCount",
            "counterVault"."totalShares" as "counterVaultTotalShares", "counterVault"."currentSharePrice" as "counterVaultCurrentSharePrice", "counterVault"."atomId" as "counterVaultAtomId", "counterVault"."tripleId" as "counterVaultTripleId", "counterVault"."positionCount" as "counterVaultPositionCount",
            AtomIpfsData.contents as "contents", AtomIpfsData.imageFilename as "imageFilename"
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
            LEFT JOIN "AtomIpfsData"
            ON "Triple"."subjectId" = "AtomIpfsData"."atomId"
            WHERE AtomIpfsData.contents <> '{}'
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
            AtomIpfsData.contents as "contents"
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
            LEFT JOIN "AtomIpfsData"
            ON "Triple"."subjectId" = "AtomIpfsData"."atomId"
            WHERE AtomIpfsData.contents <> '{}'
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

  // should probably
  public async getXUserAtom({ request, response }: HttpContextContract) {
    const { username } = request.all()
    if (!username) {
      return response.badRequest({ message: 'Missing username parameter.' })
    }
    const xComUserSerialized = await Redis.get(`xComUser:${username}`)
    let xComUser = xComUserSerialized ? JSON.parse(xComUserSerialized) : null
    const xComExistingUserIterator = await Redis.get('xComExistingUserIterator')
    if (!xComUser) {
      const xComUserIterator = await Redis.get('xComUserIterator')
      setTimeout(() => {
        console.warn('_______xComUserIterators_______', xComUserIterator, xComExistingUserIterator)
      }, 2000)
      await Redis.set('xComUserIterator', xComUserIterator ? parseInt(xComUserIterator) + 1 : 1)
      const response = await xApiAuth.get(`/users/by/username/${username}`)
      xComUser = response.data
      await Redis.set(`xComUser:${username}`, JSON.stringify(xComUser), 'EX', 60 * 60 * 24 * 7)
    } else {
      await Redis.set('xComExistingUserIterator', xComExistingUserIterator ? parseInt(xComExistingUserIterator) + 1 : 1)
    }
    // get AtomIpfsData where contents.xUsername = username
    console.log('xComUser', xComUser.data.username)
    // then join Atom table on atomId
    const rows = await Database.query()
      .from('AtomIpfsData')
      .whereRaw('contents @> ?::jsonb', [JSON.stringify({ name: username, xComUserId: xComUser.data.id })])
      .join('Atom', 'AtomIpfsData.atomId', 'Atom.id')
      .join('Vault', 'Vault.id', 'Atom.vaultId')
      .select(
        'AtomIpfsData.id',
        'AtomIpfsData.atomId',
        'AtomIpfsData.contents',
        'AtomIpfsData.contentsAttempts',
        'AtomIpfsData.imageAttempts',
        'AtomIpfsData.imageHash',
        'AtomIpfsData.imageFilename',
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

  public async getRelevantAtomsByQueryString({ request, response }: HttpContextContract) {
    console.log('getRelevantAtomsByQueryString')
    const { fullQuery: fullQuery, limit = 10 } = request.qs()
    console.log('fullQuery', fullQuery)
    const [fullType, queryTerm] = fullQuery.split('|')
    const relevantPredicate = TARGET_TYPES[fullType]

    console.log('getRelevantAtomsByQueryString', {
      fullQuery,
      fullType,
      queryTerm,
      relevantPredicate
    })
    // will also need to consider counterVault data
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
    console.log('uniqueIds', uniqueIds)

    // get the atoms for the uniqueIds and their vaults and sort by atomVault currentSharePrice * totalShares
    const atoms = await Atom.query()
      .whereIn('id', uniqueIds)
      .preload('vault') // Directly preload the vault relationship
      .preload('atomIpfsData')
      .orderByRaw('(SELECT "totalShares"::numeric * "currentSharePrice"::numeric FROM "Vault" WHERE "Vault"."atomId" = "Atom"."id") DESC')

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

const actualOrderByMapping = {
  // most-recent
  'blockTimestamp': 'blockTimestamp',

  // popularity
  'atom.vault.positionCount': 'Vault.positionCount',

  // highest-stake
  'atom.vault.totalShares * atom.vault.currentSharePrice':
    '("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18))',

  // alphabetical
  'AtomIpfsData.contents->>name': "AtomIpfsData.contents->>'name'"
}

