import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import Redis from '@ioc:Adonis/Addons/Redis'
import crypto from 'node:crypto'
import axios from 'axios'
import { AccessTokenResponse, UserDataResponse } from 'types'

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

  public async getOauthUrl({ response }: HttpContextContract) {
    console.log('in Twitter::getOauthUrl')
    const prefix = 'https://twitter.com/i/oauth2/authorize'
    const { challenge: code_challenge, verifier: code_verifier} = await generatePKCE()
    const state = await generateRandomString(38)
    const params = {
      response_type: 'code',
      client_id: Env.get('TWITTER_CLIENT_ID'),
      redirect_uri: Env.get('TWITTER_CALLBACK_URL_OAUTH2'),
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge,
      code_challenge_method: 'S256'
    }
    const searchParams = new URLSearchParams(params)
    const url = `${prefix}?${searchParams.toString()}`
    console.log('Twitter::getOauthUrl url', url)
    // save code_verifier to redis
    Redis.set(`code_verifier:${state}`, code_verifier, 'EX', 60 * 15)
    return response.json({
      url
    })

  }

  public async exchangeAuthCodeForAccessToken({ request, response }: HttpContextContract) {
    console.log('in Twitter::exchangeAuthCodeForAccessToken')
    const { authCode, state } = request.qs()
    const codeVerifier = await Redis.get(`code_verifier:${state}`)

    if (!codeVerifier) {
      return response.status(400).json({ error: 'Code verifier not found' })
    }

    const params = {
      client_id: Env.get('TWITTER_CLIENT_ID'),
      client_secret: Env.get('TWITTER_CLIENT_SECRET'),
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: Env.get('TWITTER_CALLBACK_URL_OAUTH2'),
      code_verifier: codeVerifier
    }

    const twitterURL = `https://api.twitter.com/2/oauth2/token`
    console.log('Twitter::exchangeAuthCodeForAccessToken params', JSON.stringify(Object.keys(params)))

    try {
      const clientIdAndSecret = `${Env.get('TWITTER_CLIENT_ID')}:${Env.get('TWITTER_CLIENT_SECRET')}`
      console.log('clientIdAndSecret', clientIdAndSecret)
      // now encode it in base64
      const base64EncodedClientIdAndSecret = Buffer.from(clientIdAndSecret).toString('base64')
      console.log('base64EncodedClientIdAndSecret', base64EncodedClientIdAndSecret)
      const basicAuthValue = `Basic ${base64EncodedClientIdAndSecret}`
      const { data: accessTokenResponse }: { data: AccessTokenResponse } = await axios.post(twitterURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': basicAuthValue
        }
      })
      console.log('Twitter::exchangeAuthCodeForAccessToken accessTokenResponse', accessTokenResponse)
      const { data: userData }: { data: UserDataResponse } = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessTokenResponse.access_token}`
        }
      })
      console.log('Twitter::exchangeAuthCodeForAccessToken userData', userData)
      // Securely handle the token here. Return only what's needed to the client.
      return response.json({
        ...accessTokenResponse,
        ...userData.data,
        expires_in: parseInt(Env.get('TWITTER_AUTH_EXPIRATION')) * 1000,
        created_at: new Date().getTime()
      })
    } catch (error) {
      console.error('Twitter::exchangeAuthCodeForAccessToken error', error)
      console.error('Twitter::exchangeAuthCodeForAccessToken error', error.response?.data || error.message)
      return response.status(error.response?.status || 500).json({
        error: `Error in Twitter::exchangeAuthCodeForAccessToken: ${error.message}`
      })
    } finally {
      // Optionally clean up code_verifier from Redis
      await Redis.del(`code_verifier:${state}`)
    }
  }
}
// ZlljSjU3bklTb0RtcEotTkNRbHd2T1cyYlgwZnJpbDJmdXBDQmpUTzd2Rmp4OjE3MzU0MTIyMTA4NjE6MTowOmFjOjE
// pLC6HVCJYweaSlVp6zR9OigKlqm5Yyp2y5ooyJqBBH8
// async function generateCodeVerifier(): Promise<string> {
//   const array = new Uint32Array(56/4);
//   const randomValues = crypto.getRandomValues(array);
//   const randomValueString = String.fromCharCode.apply(null, randomValues)
//   const randomValueStringBase64 = Buffer.from(randomValueString).toString('base64')
//   const finalValue = randomValueStringBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').substr(0, 43);
//   return finalValue
// }

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  var digest = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(codeVerifier));

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function generatePKCE(): Promise<{ verifier: string, challenge: string }> {
  const verifier = await generateRandomString(43);
  const challenge = await generateCodeChallenge(verifier)
  return {
    verifier,
    challenge
  }
}

async function generateRandomString(length: number): Promise<string> {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
