import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Atom from 'App/Models/Atom'
import Triple from 'App/Models/Triple'

export default class HexesController {
  public async getHexAtoms({ request, response }: HttpContextContract) {
    const { hexId } = request.params()
    const atoms = await Atom.query()
      .whereLike('data', `%${hexId}%`)
      .preload('vault')
    return response.json(atoms)
  }

  public getHexTriples = async ({ request, response}: HttpContextContract) => {
    const { hexId } = request.params()
    const atoms = await Atom.query()
    .whereLike('data', `%${hexId}%`)
      .preload('subjectTriples', (query) => {
        query.preload('subject', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('predicate', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('object', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('vault', (q) => q.preload('positions'))
        query.preload('counterVault', (q) => q.preload('positions'))
      })
      .preload('predicateTriples', (query) => {
        query.preload('subject', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('predicate', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('object', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('vault', (q) => q.preload('positions'))
        query.preload('counterVault', (q) => q.preload('positions'))
      })
      .preload('objectTriples', (query) => {
        query.preload('subject', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('predicate', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('object', (q) => q.preload('vault').preload('atomIpfsData'))
        query.preload('vault', (q) => q.preload('positions'))
        query.preload('counterVault', (q) => q.preload('positions'))
      })
      .limit(10)

    return response.json(atoms)
  }

  public getTopEvmAddressAtoms = async ({ request, response }: HttpContextContract) => {
    const { evmAddress, limit = 10 } = request.qs()
    const atoms = await Atom.query()
      .whereHas('atomIpfsData', (builder) => {
        builder.whereRaw("contents->>'evmAddress' = ?", [evmAddress])
      })
      .preload('vault')
      .preload('atomIpfsData')
      .orderByRaw('(SELECT "totalShares"::numeric * "currentSharePrice"::numeric FROM "Vault" WHERE "Vault"."atomId" = "Atom"."id") DESC')
      .limit(limit)
    return response.json(atoms)
  }
}
