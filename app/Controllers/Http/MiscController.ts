import Redis from '@ioc:Adonis/Addons/Redis'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'

export default class MiscController {
  public async getExchangeRates({ response }: HttpContextContract) {
    // get exchange Rates from redis
    // i++
    // return response.json({ eth_usd: { id: i, usd: i} })
    const exchangeRates = await Redis.get('exchangeRates')
    if (!exchangeRates) {
      // get from chainlinkPrice table
      const [ethPrice] = await Database.from('ChainlinkPrice').orderBy('id', 'desc')
      if (!ethPrice) {
        return response.status(500).json({ error: 'No exchange rates found' })
      }
      await Redis.set('exchangeRates', JSON.stringify({ eth_usd: ethPrice }), 'EX', 60)
      return response.json({ eth_usd: ethPrice })
    } else {
      // console.log('exchangeRates', exchangeRates)
      return response.json(JSON.parse(exchangeRates))
    }
  }
}
