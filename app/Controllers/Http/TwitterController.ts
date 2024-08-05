import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import oauthSig from 'oauth-signature'

export default class Twitter {
  public async getRequestToken({}: HttpContextContract) {
    const signature = oauthSig.generate(
      'POST',
      'https://api.twitter.com/oauth/request_token', {
        oauth_callback: 'http://127.0.0.1:3333/twitter/callback'
      },
      Env.get('TWITTER_CLIENT_ID'),
      Env.get('TWITTER_CLIENT_SECRET')
    )
    console.log('Twitter::getRequestToken signature', signature)
    const { data } = await axios.post('https://api.twitter.com/oauth/request_token', {
      oauth_callback: 'http%3A%2F%2F127.0.0.1%3A3333%2Ftwitter%2Fcallback'
    }, {
      headers: {
        'Authorization ': `OAuth oauth_nonce="K7ny27JTpKVsTgdyLdDfmQQWVLERj2zAK5BslRsqyw", oauth_callback="http%3A%2F%2F127.0.0.1%3A3333%2Ftwitter%2Fcallback", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1722803476", oauth_consumer_key="ZHN2aFRnZjlkczNaZ3dONWp4THM6MTpjaQ", oauth_signature="${signature}", oauth_version="1.0"`
      }
    })
    console.log('Twitter::getRequestToken data', data)
  }

  public async twitterCallback({}: HttpContextContract) {
    console.log('in Twitter::twitterCallback')
  }
}
