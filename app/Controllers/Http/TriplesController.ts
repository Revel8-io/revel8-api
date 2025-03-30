import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Triple from 'App/Models/Triple'
import Event from '@ioc:Adonis/Core/Event'
import Database from '@ioc:Adonis/Lucid/Database'

Event.on('db:query', Database.prettyPrint)

export default class TriplesController {
  public async getTriplesByAtomId({ params, response }: HttpContextContract) {
    const { atomId } = params
    // query for all triples that have atomId as subjectId, predicateId, or objectId
    // and also include the vaults and atoms for the subjectId, predicateId, and objectId
    // const triples = await Database.query()
    //   .from('Triple')
    //   .where('Triple.subjectId', atomId)
    //   .orWhere('Triple.predicateId', atomId)
    //   .orWhere('Triple.objectId', atomId)
    //   .leftJoin('Vault', 'Vault.id', 'Triple.vaultId')
    //   .leftJoin('Vault as CounterVault', 'CounterVault.id', 'Triple.counterVaultId')
    //   .leftJoin('Atom as SubjectAtom', 'SubjectAtom.id', 'Triple.subjectId')
    //   .leftJoin('Atom as PredicateAtom', 'PredicateAtom.id', 'Triple.predicateId')
    //   .leftJoin('Atom as ObjectAtom', 'ObjectAtom.id', 'Triple.objectId')

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
    return response.json(triples)
  }
}
