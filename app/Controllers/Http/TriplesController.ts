import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Triple from 'App/Models/Triple'
import Event from '@ioc:Adonis/Core/Event'
import Database from '@ioc:Adonis/Lucid/Database'

Event.on('db:query', Database.prettyPrint)

export default class TriplesController {
  public async getTriplesByAtomId({ params, response }: HttpContextContract) {
    const { atomId } = params
    // use the Triple model to get the triples
    const triples = await Triple.query()
      .where('subjectId', atomId)
      .orWhere('predicateId', atomId)
      .orWhere('objectId', atomId)
      .preload('subject', (query) => {
        query.preload('vault')
        query.preload('atomIpfsData')
      })
      .preload('predicate', (query) => {
        query.preload('vault')
        query.preload('atomIpfsData')
      })
      .preload('object', (query) => {
        query.preload('vault')
        query.preload('atomIpfsData')
      })
      .preload('vault')
      .preload('counterVault')
    return response.json(triples)
  }

  public async getTriplesRankingsWithContents({ params, response }: HttpContextContract) {
    const { atoms } = params
    const [subjectId, predicateId, objectId] = atoms.split(',')
    const triples = await Triple.query()
      .where(subjectId ? 'subjectId' : 'predicateId', subjectId ? subjectId : predicateId)
      .andWhere(objectId ? 'objectId' : 'predicateId', objectId ? objectId : predicateId)
      .preload('subject', (query) => {
        query.preload('vault')
        query.preload('atomIpfsData')
      })
      .preload('predicate', (query) => {
        query.preload('vault')
        query.preload('atomIpfsData')
      })
      .preload('object', (query) => {
        query.preload('vault')
        query.preload('atomIpfsData')
      })
      .preload('vault')
      .preload('counterVault')
    return response.json(triples)
  }
}
