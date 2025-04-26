import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Atom from 'App/Models/Atom'

export default class SearchAtomsController {
  public async index({ request, response }: HttpContextContract) {
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

    // Get sorting parameters - prioritize 'sort' special case
    const sort = request.input('sort')

    // Only use legacy parameters as fallback
    const orderBy = request.input('orderBy', 'blockTimestamp')
    const direction = request.input('direction', 'desc')
    const order = direction === 'asc' ? 'asc' : 'desc'

    // Determine the actual sort type based on the 'sort' parameter
    let sortType = 'most-recent'

    // If sort parameter is provided, it takes precedence
    if (sort) {
      switch (sort) {
        case 'most-recent':
          sortType = 'most-recent'
          break
        case 'highest-stake':
          sortType = 'highest-stake'
          break
        case 'popularity':
          sortType = 'popularity'
          break
        case 'alphabetical':
          sortType = 'alphabetical'
          break
        default:
          // If sort is not found among special cases, use the provided sortType or default
          sortType = request.input('sortType', 'most-recent')
      }
    } else {
      // Sort parameter not provided, determine sort type from legacy parameters
      if (orderBy === 'atom.vault.totalShares * atom.vault.currentSharePrice') {
        sortType = 'highest-stake'
      } else if (orderBy === 'atom.vault.positionCount' || orderBy === 'positionCount') {
        sortType = 'popularity'
      } else if (orderBy === 'atomIpfsData.contents>>name' || orderBy === 'AtomIpfsData.contents->>name') {
        sortType = 'alphabetical'
      } else {
        // Use the provided sortType or default to most-recent
        sortType = request.input('sortType', 'most-recent')
      }
    }

    // Handle different sort types
    if (sortType === 'highest-stake' || sortType === 'popularity') {
      // Use Database query builder for complex sorting
      const query = Database.query()
        .from('Atom')
        .leftJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atom_id')
        .leftJoin('Vault', 'Vault.id', 'Atom.vaultId')
        .select(
          // Select Atom fields explicitly with the table name to avoid conflicts
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
          // Select AtomIpfsData fields with aliases to avoid ID conflicts
          'AtomIpfsData.id as atomIpfsDataId',
          'AtomIpfsData.atomId',
          'AtomIpfsData.contents',
          'AtomIpfsData.contentsAttempts',
          'AtomIpfsData.imageAttempts',
          'AtomIpfsData.imageHash',
          'AtomIpfsData.imageFilename',
          'AtomIpfsData.createdAt as atomIpfsDataCreatedAt',
          'AtomIpfsData.updatedAt as atomIpfsDataUpdatedAt',
          // Select Vault fields with aliases to avoid ID conflicts
          'Vault.id as vaultId',
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
      // Use Database query for alphabetical sorting by name
      // We need to use a join to sort by a field in the atomIpfsData table
      const query = Database.query()
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
        .orderByRaw(`${actualOrderByMapping['AtomIpfsData.contents->>name']} ${order}`);

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

  public async fuzzySearchAtomContents({ request, response }: HttpContextContract) {
    const { q, limit = 20, page = 1 } = request.qs()
    const atoms = await Atom.query()
      .preload('atomIpfsData')
      .whereHas('atomIpfsData', (query) => {
        if (q) {
          query.whereRaw("contents::text ILIKE ?", [`%${q}%`])
        }
      })
      .preload('vault')
      .orderBy('blockTimestamp', 'desc')
      .paginate(page, limit)
    const output = atoms.serialize()
    const atomsWithAccuracy = output.data.map((atom) => {
      const queryStringLength = q.length
      const atomContentsLength = atom.atomIpfsData?.contents?.name?.length || 0
      const accuracy = atomContentsLength ? (queryStringLength / atomContentsLength) : 0
      return {
        ...atom,
        accuracy
      }
    }).sort((a, b) => b.accuracy - a.accuracy)
    return response.json(atomsWithAccuracy)
  }
}

// Mapping for translating frontend orderBy fields to database fields
const actualOrderByMapping = {
  // most-recent
  'blockTimestamp': 'blockTimestamp',

  // popularity
  'atom.vault.positionCount': 'Vault.positionCount',

  // highest-stake
  'atom.vault.totalShares * atom.vault.currentSharePrice':
    '("Vault"."totalShares"::NUMERIC / POWER(10, 18)) * ("Vault"."currentSharePrice"::NUMERIC / POWER(10, 18))',

  // alphabetical
  'atomIpfsData.contents->>name': "AtomIpfsData.contents->>'name'",
  'atomIpfsData.contents>>name': "AtomIpfsData.contents->>'name'"
}
