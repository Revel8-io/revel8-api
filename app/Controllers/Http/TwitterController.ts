import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import Redis from '@ioc:Adonis/Addons/Redis'

const LoginWithTwitter = require('login-with-twitter')

const tw = new LoginWithTwitter({
  consumerKey: Env.get('TWITTER_CONSUMER_KEY'),
  consumerSecret: Env.get('TWITTER_CONSUMER_SECRET'),
  callbackUrl: Env.get('TWITTER_CALLBACK_URL')
})

export default class Twitter {
  public async getRequestToken({ request, response }: HttpContextContract) {
    // get rand query param
    const { rand } = request.qs()
    console.log('rand', rand)
    const myFn = () => {
      return new Promise((resolve, reject) => {
        tw.login((err, tokenSecret, url) => {
          if (err) {
            reject(`Error in Twitter::getRequestToken: ${err}`)
          }
          console.log('tokenSecret, url', tokenSecret, url)
          // save tokenSecret to redis
          Redis.set(`oauth_request:${rand}`, tokenSecret)
          resolve({ tokenSecret, url })
        })
    })
    }
    const data = await myFn()
    console.log('data', data)
    return response.json(data)
  }

  public async twitterCallback({}: HttpContextContract) {
    console.log('in Twitter::twitterCallback')
  }
}
