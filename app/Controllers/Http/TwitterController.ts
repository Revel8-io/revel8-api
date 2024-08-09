import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import Redis from '@ioc:Adonis/Addons/Redis'

const LoginWithTwitter = require('login-with-twitter')

type TwitterCallbackResponse = {
  userName: string
  userId: string
  userToken: string
  userTokenSecret: string
}

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
        tw.login(async (err, tokenSecret, url) => {
          if (err) {
            reject(`Error in Twitter::getRequestToken: ${err}`)
          }
          console.log('tokenSecret, url', tokenSecret, url)
          const searchParamString = url.split('?')[1]
          const searchParams = new URLSearchParams(searchParamString)
          const oauthToken = searchParams.get('oauth_token')
          // save tokenSecret to redis
          Redis.set(`oauth_request:${oauthToken}`, tokenSecret, 'EX', 60 * 15)
          await Redis.set(`is_validated:${oauthToken}`, '', 'EX', 60 * 15)
          resolve({
            tokenSecret,
            url
          })
        })
    })
    }
    const data = await myFn()
    console.log('data', data)
    return response.json(data)
  }

  public async twitterCallback({ view, request, response }: HttpContextContract) {
    const { oauth_token, oauth_verifier } = request.qs()
    console.log('in Twitter::twitterCallback', oauth_token, oauth_verifier)
    const tokenSecret = await Redis.get(`oauth_request:${oauth_token}`)
    console.log('tokenSecret', tokenSecret)
    tw.callback({
      oauth_token,
      oauth_verifier
    }, tokenSecret, async (error, user: TwitterCallbackResponse) => {
      if (error) {
        console.error(`Error in Twitter::twitterCallback: ${error}`)
        return response.json({
          error
        })
      }
      await Redis.set(`is_validated:${oauth_token}`, JSON.stringify(user), 'EX', 60 * 15)
      console.log('user', user)
      return response.json(user)
    })
    console.log('returning view')
    return view.render('twitter_callback')
  }

  public async userValidationCheck({ request, response }: HttpContextContract) {
    const { oauth_token } = request.qs()
    const serializedUser = await Redis.get(`is_validated:${oauth_token}`)
    console.log('serializedUser', serializedUser)
    if (!serializedUser) {
      return response.json({
        isValidated: false
      })
    }
    const user = JSON.parse(serializedUser)
    return response.json({
      isValidated: true,
      user
    })
  }
}
