import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs/promises'

import { CONFIG } from '../../../util/'
import Atom from 'App/Models/Atom'

const { IS_ATOMS, IS_RELEVANT_X_ATOM } = CONFIG

export default class AtomsController {

  public async index({ request, response }: HttpContextContract) {
    /*
    *
    const sortQueriesMap: Record<SortOption, Record<string, any>> = {
      'most-recent': {
        orderBy: 'blockTimestamp',
        order: 'desc'
      },
      'popularity': {
        orderBy: 'atom.vault.positionCount',
        order: 'desc'
      },
      'highest-stake': {
        orderBy: 'atom.vault.totalShares * atom.vault.currentSharePrice',
        order: 'desc'
      },
      'alphabetical': {
        orderBy: 'atom_ipfs_data.contents->>name',
        order: 'asc'
      },
    }
    */

    // Parse and validate pagination parameters
    let page = 1
    let perPage = 20
    try {
      page = parseInt(request.input('page', '1'))
      if (isNaN(page) || page < 1) page = 1

      perPage = parseInt(request.input('perPage', '20'))
      if (isNaN(perPage) || perPage < 1) perPage = 20
    } catch (error) {
      console.error('Pagination parameter error:', error)
    }

    const sortType = request.input('sortType', 'most-recent')
    const order = request.input('order', 'desc')

    // Handle different sort types
    if (sortType === 'highest-stake' || sortType === 'popularity') {
      // Use Database query builder for complex sorting
      const query = Database.query()
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

      if (sortType === 'highest-stake') {
        query.orderByRaw(`${actualOrderByMapping['atom.vault.totalShares * atom.vault.currentSharePrice']} ${order}`)
      } else {
        // popularity
        query.orderBy(actualOrderByMapping['atom.vault.positionCount'], order)
      }

      // Manual pagination
      const countResult = await Database.from('Atom').count('* as total').first()
      const total = countResult ? parseInt(countResult.total as string) : 0

      const safeLimit = Math.max(1, perPage)
      const safeOffset = Math.max(0, (page - 1) * safeLimit)

      query.limit(safeLimit).offset(safeOffset)
      const atoms = await query

      // Create pagination metadata
      const lastPage = Math.ceil(total / safeLimit) || 1
      return response.json({
        meta: {
          total,
          per_page: safeLimit,
          current_page: page,
          last_page: lastPage,
        },
        data: atoms
      })

    } else if (sortType === 'alphabetical') {
      // Use Lucid query for alphabetical sorting by name
      const atoms = await Atom.query()
        .preload('atomIpfsData')
        .preload('vault')
        .orderByRaw(`${actualOrderByMapping['atom_ipfs_data.contents->>name']} ${order}`)
        .paginate(page, perPage)
      return response.json(atoms)

    } else {
      // Default 'most-recent' sorting by blockTimestamp
      const atoms = await Atom.query()
        .preload('atomIpfsData')
        .preload('vault')
        .orderBy(actualOrderByMapping['blockTimestamp'], order)
        .paginate(page, perPage)
      return response.json(atoms)
    }
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

    // Get sorting parameters
    let orderBy = request.qs().orderBy || 'blockTimestamp'
    const order = request.qs().order === 'asc' ? 'asc' : 'desc'

    // Special sorting options
    const sortByVaultValue = request.qs().sortByVaultValue === 'true'
    const sortByPositionCount = orderBy === 'positionCount'

    // If sorting by position count, we'll need to use the custom DB query
    const needsCustomSorting = sortByVaultValue || sortByPositionCount

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
    const atom = await Database.query().from('Atom').where('id', atomId).first()
    return response.json(atom)
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
    const atom = await Database.query()
      .from('Atom')
      .where('Atom.id', atomId)
      .leftJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
      .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
      .first()
    return response.json(atom)
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

