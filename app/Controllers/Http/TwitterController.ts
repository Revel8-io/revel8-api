import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import Redis from '@ioc:Adonis/Addons/Redis'
import { base64_urlencode } from '../../../util'

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

  public async getRequestTokenOauth2({ request, response }: HttpContextContract) {
    console.log('in Twitter::getRequestTokenOauth2')
    const prefix = 'https://twitter.com/i/oauth2/authorize'
    const code_challenge = base64_urlencode(Env.get('TWITTER_CODE_CHALLENGE'))
    const params = {
      response_type: 'code',
      client_id: Env.get('TWITTER_CLIENT_ID'),
      redirect_uri: Env.get('TWITTER_CALLBACK_URL_OAUTH2'),
      scope: 'tweet.read users.read offline.access',
      state: Env.get('TWITTER_STATE_SECRET'),
      code_challenge,
      code_challenge_method: 'plain'
    }
    const searchParams = new URLSearchParams(params)
    const url = `${prefix}?${searchParams.toString()}`
    console.log('getRequestTokenOauth2 url', url)
    return response.json({
      url
    })
  }
}
