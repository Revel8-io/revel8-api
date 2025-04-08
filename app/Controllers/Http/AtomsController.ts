import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs/promises'

import { CONFIG } from '../../../util/'
import Atom from 'App/Models/Atom'

const { IS_ATOMS, IS_RELEVANT_X_ATOM } = CONFIG

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

    // Start query with the Atom model
    const query = Atom.query()
      .preload('atomIpfsData') // Preload related data
      .preload('vault')

    // Conditionally join tables ONLY if needed for sorting
    // We need joins to make related table columns available for orderBy
    if (sortByVaultValue || sortByPositionCount) {
        // Use 'vaults' as alias if your table name is 'vaults' and relation is 'vault'
        // Adjust 'vaults' to your actual Vault table name if different
        query.leftJoin('vaults as Vault', 'Atom.vaultId', 'Vault.id')
    }
    if (sortByAlphabetical) {
        // Adjust 'atom_ipfs_data' to your actual table name if different
        query.leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
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
      query.orderByRaw(`atom_ipfs_data.contents->>'name' ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`)
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
    const { query } = params

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
    const isNumeric = !isNaN(Number(query)) && !isNaN(parseFloat(query))

    // Build base query
    let atomsQuery

    // If using custom sorting (either vault value or position count)
    if (needsCustomSorting) {
      // Use Database query builder for more complex joins and sorting
      atomsQuery = Database.query()
        .from('Atom')
        .leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
        .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
        .select(
          'Atom.*',
          'atom_ipfs_data.*',
          'Vault.totalShares',
          'Vault.currentSharePrice',
          'Vault.positionCount'
        )

      if (isNumeric) {
        const atomId = parseInt(query)
        atomsQuery.where('Atom.id', atomId)
      }

      // Case-insensitive search with ILIKE
      atomsQuery.orWhereRaw("CAST(atom_ipfs_data.contents AS TEXT) ILIKE ?", [`%${query}%`])

      // Apply the appropriate custom sorting
      if (sortByVaultValue) {
        // Sort by vault value (totalShares * currentSharePrice)
        atomsQuery.orderByRaw(`("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18)) ${order === 'asc' ? 'ASC' : 'DESC'}`)
      } else if (sortByPositionCount) {
        // Sort by position count
        atomsQuery.orderBy('Vault.positionCount', order)
      } else if (sortByAlphabetical) {
        // Sort alphabetically by name
        atomsQuery.orderByRaw(`atom_ipfs_data.contents->>'name' ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`)
      } else if (sortByMostRecent) {
        // Sort by most recent (blockTimestamp)
        atomsQuery.orderBy('Atom.blockTimestamp', order)
      }

      // Custom pagination
      const countQuery = Database.query()
        .from('Atom')
        .leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
        .count('* as total')

      if (isNumeric) {
        const atomId = parseInt(query)
        countQuery.where('Atom.id', atomId)
      }

      // Case-insensitive search with ILIKE
      countQuery.orWhereRaw("CAST(atom_ipfs_data.contents AS TEXT) ILIKE ?", [`%${query}%`])

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
          per_page: safeLimit,
          current_page: page,
          last_page: lastPage,
          first_page: 1,
          first_page_url: `?page=1`,
          last_page_url: `?page=${lastPage}`,
          next_page_url: page < lastPage ? `?page=${page + 1}` : null,
          previous_page_url: page > 1 ? `?page=${page - 1}` : null,
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
        const atomId = parseInt(query)
        atomsQuery.where('id', atomId)
      }

      // Also search for atoms where atomIpfsData.contents contains the query
      // Using ILIKE for case-insensitive matching
      atomsQuery
        .orWhereHas('atomIpfsData', (builder) => {
          builder.whereRaw("CAST(contents AS TEXT) ILIKE ?", [`%${query}%`])
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
        .leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
        .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
        .select(
          'Atom.*',
          'atom_ipfs_data.contents',
          'atom_ipfs_data.image_filename',
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
      .leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
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
        // Select atom_ipfs_data fields
        'atom_ipfs_data.id as atomIpfsDataId',
        'atom_ipfs_data.atom_id',
        'atom_ipfs_data.contents',
        'atom_ipfs_data.contents_attempts',
        'atom_ipfs_data.image_attempts',
        'atom_ipfs_data.image_hash',
        'atom_ipfs_data.image_filename',
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
        atom_id: atom.atom_id,
        contents: atom.contents,
        contents_attempts: atom.contents_attempts,
        image_attempts: atom.image_attempts,
        image_hash: atom.image_hash,
        image_filename: atom.image_filename
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
            atom_ipfs_data.contents as "contents", atom_ipfs_data.image_filename as "image_filename"
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

const actualOrderByMapping = {
  // most-recent
  'blockTimestamp': 'blockTimestamp',

  // popularity
  'atom.vault.positionCount': 'Vault.positionCount',

  // highest-stake
  'atom.vault.totalShares * atom.vault.currentSharePrice':
    '("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18))',

  // alphabetical
  'atom_ipfs_data.contents->>name': "atom_ipfs_data.contents->>'name'"
}

