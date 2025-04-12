import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Signal from 'App/Models/Signal'
export default class SignalsController {
  public async getSignalsByVaultId({ params, request }: HttpContextContract) {
    // get orderBy query string
    const { orderBy } = request.qs()

    const { tripleId } = params
    const signals = await Signal.query()
      .where('tripleId', tripleId)
      .preload('triple')
      .orderBy(orderBy, 'desc')
      .limit(20)
    return signals
  }

  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {}

  public async store({}: HttpContextContract) {}

  public async show({}: HttpContextContract) {}

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
