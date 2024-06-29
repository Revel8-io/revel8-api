import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Note from 'App/Models/Note'

export default class NotesController {
  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {
  }

  public async store({request, response}: HttpContextContract) {
    const createNoteSchema = schema.create({
      author: schema.string(),
      target: schema.string(),
      note: schema.string()
    })

    const payload = await request.validate({ schema: createNoteSchema })
    // need to translate usernames to unique IDs
    await Note.create(payload)
    return response.status(201)
  }

  public async show({}: HttpContextContract) {}

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
