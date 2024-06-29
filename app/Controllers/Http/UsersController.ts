import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'

import User from 'App/Models/User'

export default class UsersController {
  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {
  }

  public async store({request, response}: HttpContextContract) {
    const createUserSchema = schema.create({
      id: schema.string(),
      username: schema.string(),
    })
    console.log('schema created')
    const payload = await request.validate({ schema: createUserSchema })
    console.log('payload validated')
    // get user id and username from request body
    // const { id, username } = request.only(['id', 'username'])
    // create model of user and commit to database
    await User.create(payload)
    console.log('user created')
    // return response
    return response.status(201)
  }

  public async show({}: HttpContextContract) {}

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
