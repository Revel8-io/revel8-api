import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Note from 'App/Models/Note'

export default class NotesController {
  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {
  }

  public async store({request, response}: HttpContextContract) {
    console.log('request.all()', request.all())
    const createNoteSchema = schema.create({
      author: schema.string(),
      target: schema.string(),
      note: schema.string(),
      relatedTweetUrl: schema.string(),
      relatedTweetId: schema.string(),
    })

    const payload = await request.validate({ schema: createNoteSchema })
    console.log('payload', payload)
    // need to translate usernames to unique IDs
    await Note.create({
      ...payload,
      author: payload.author.toLowerCase(),
      target: payload.target.toLowerCase(),
    })
    return response.status(201)
  }

  // get author target notes
  public async getAuthorTargetNotes({ request, response }: HttpContextContract) {
    const { author, target } = request.qs()
    const getAuthorTargetNotesSchema = schema.create({
      author: schema.string(),
      target: schema.string()
    })
    await request.validate({ schema: getAuthorTargetNotesSchema})
    const result = await Note.query()
                    .where('author', author.toLowerCase())
                    .andWhere('target', target.toLowerCase())
                    .orderBy('createdAt', 'desc')
    return response.json(result)
  }

  public async show({ request, response }: HttpContextContract) {

  }

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
