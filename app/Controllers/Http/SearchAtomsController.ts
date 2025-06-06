import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Atom from 'App/Models/Atom'

export default class SearchAtomsController {
  public async fuzzySearchAtomContents({ request, response }: HttpContextContract) {
    const { q = '' } = request.qs()

    // Parse and validate pagination parameters (like your index method)
    let page = 1
    let limit = 20
    try {
      page = parseInt(request.input('page', '1'))
      if (isNaN(page) || page < 1) page = 1

      limit = parseInt(request.input('limit', '20'))
      if (isNaN(limit) || limit < 1) limit = 20
    } catch (error) {
      console.error('Pagination parameter error:', error)
    }

    // Build the query using Atom model
    const atomsQuery = Atom.query()
      .preload('atomIpfsData')
      .preload('vault')

    // Add search logic if query is provided
    if (q) {
      // Check if query is numeric (potential atom ID)
      const isNumeric = !isNaN(Number(q)) && !isNaN(parseFloat(q))

      if (isNumeric) {
        atomsQuery.where('id', parseInt(q))
      }

      // Search in atomIpfsData contents (case-insensitive)
      atomsQuery.orWhereHas('atomIpfsData', (builder) => {
        builder.whereRaw("CAST(contents AS TEXT) ILIKE ?", [`%${q}%`])
      })
    }

    // Execute query with pagination
    const atoms = await atomsQuery
      .orderBy('blockTimestamp', 'desc')
      .paginate(page, limit)

    // Calculate accuracy and sort by relevance
    const output = atoms.serialize()
    const atomsWithAccuracy = output.data.map((atom) => {
      const queryStringLength = q.length
      const atomContentsLength = atom.atomIpfsData?.contents?.name?.length || 0
      const accuracy = queryStringLength && atomContentsLength
        ? (queryStringLength / atomContentsLength)
        : 0

      return {
        ...atom,
        accuracy
      }
    }).sort((a, b) => b.accuracy - a.accuracy)

    // Return with original pagination metadata
    return response.json({
      ...output,
      data: atomsWithAccuracy
    })
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
