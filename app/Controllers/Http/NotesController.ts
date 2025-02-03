import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import fs from 'fs/promises'
import Note from 'App/Models/Note'

export default class NotesController {
  public async index({ }: HttpContextContract) { }

  public async create({ }: HttpContextContract) {
  }

  public async store({ request, response }: HttpContextContract) {
    const createNoteSchema = schema.create({
      author: schema.string(),
      target: schema.string(),
      note: schema.string(),
      relatedTweetUrl: schema.string(),
      relatedTweetId: schema.string(),
    })

    const payload = await request.validate({ schema: createNoteSchema })
    // need to translate usernames to unique IDs
    await this.saveAuthorTargetNotes(payload)
    return response.status(201)
  }

  private async saveAuthorTargetNotes(data) {
    await Note.create({
      ...data,
      author: data.author.toLowerCase(),
      target: data.target.toLowerCase(),
    })
  }

  public async storeAndGetAuthorTargetNotes({ request, response }: HttpContextContract) {
    const createNoteSchema = schema.create({
      author: schema.string(),
      target: schema.string(),
      note: schema.string(),
      relatedTweetUrl: schema.string(),
      relatedTweetId: schema.string(),
    })

    const payload = await request.validate({ schema: createNoteSchema })
    await this.saveAuthorTargetNotes(payload)
    const { author, target } = payload
    const result = await this.retrieveAuthorTargetNotes(author, target)
    return response.status(201).json(result)
  }

  private async retrieveAuthorTargetNotes(author: string, target: string) {
    const result = await Note.query()
      .where('author', author.toLowerCase())
      .andWhere('target', target.toLowerCase())
      .orderBy('createdAt', 'desc')
    return result
  }

  // get author target notes
  public async getAuthorTargetNotes({ request, response }: HttpContextContract) {
    const { author, target } = request.qs()
    console.log('author', author, 'target', target)
    const getAuthorTargetNotesSchema = schema.create({
      author: schema.string(),
      target: schema.string()
    })
    await request.validate({ schema: getAuthorTargetNotesSchema })
    const result = await this.retrieveAuthorTargetNotes(author, target)
    response.json(result)
    // read from '../../authorTargetNotes.json' then add key target to the object
    // then save the file
    console.log('about to read')
    const file = await fs.readFile('authorTargetNotes.json', 'utf8')
    const data = JSON.parse(file)
    data[target] = null
    console.log('about to rewrite')
    await fs.writeFile('authorTargetNotes.json', JSON.stringify(data, null, 2))
    return
  }

  public async show({ request, response }: HttpContextContract) {

  }

  public async edit({ }: HttpContextContract) { }

  public async update({ }: HttpContextContract) { }

  public async destroy({ }: HttpContextContract) { }
}
