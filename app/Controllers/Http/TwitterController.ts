import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import oauthSig from 'oauth-signature'
const LoginWithTwitter = require('login-with-twitter')

// const tw = new LoginWithTwitter({
//   consumerKey: 'ZHN2aFRnZjlkczNaZ3dONWp4THM6MTpjaQ',
//   consumerSecret: 'r_EfkJXl96Iv9AU-RFmZtTRkfdY1ALmcuAymGAJWkoMn41fYgt',
//   callbackUrl: 'http%3A%2F%2F127.0.0.1%3A3333%2Ftwitter%2Fcallback'
// })

const tw = new LoginWithTwitter({
  consumerKey: 'cVphiHU5mCUhObMtht5kMz72F',
  consumerSecret: 'fJgLX99CYQ1RRl0elWlkJz00zPZNz87XV3sSBs8aURomf3c91U',
  callbackUrl: 'http://127.0.0.1:3333/twitter/callback'
})

const oauth_consumer_key="ZHN2aFRnZjlkczNaZ3dONWp4THM6MTpjaQ"
const oauth_signature_method="HMAC-SHA1"
const oauth_timestamp= Math.floor(Date.now() / 1000)
const oauth_nonce="kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4ca"
const oauth_version="1.0"
const oauth_token="395443018-qjm7njZvCqNQlOIT83LZn6JQKUS52nx9o1x1V4w6"

const oauth_signature="tnnArxj06cWHq44gCs1OSKk%2FjLY%3D"

export default class Twitter {
  public async getRequestToken({request, response}: HttpContextContract) {
    tw.login((err, tokenSecret, url) => {
      if (err) {
        console.log('err: ', err)
      }

      // Save the OAuth token secret for use in your /twitter/callback route
      // request.session.tokenSecret = tokenSecret
      console.log('tokenSecret: ', tokenSecret)
      console.log('url: ', url)

      // Redirect to the /twitter/callback route, with the OAuth responses as query params
      // response.redirect(url)
    })
    // const signature = oauthSig.generate(
    //   'POST',
    //   'https://api.twitter.com/oauth/request_token', {
    //     oauth_callback: 'http://127.0.0.1:3333/twitter/callback'
    //   },
    //   Env.get('TWITTER_CLIENT_ID'),
    //   Env.get('TWITTER_CLIENT_SECRET')
    // )
    // console.log('Twitter::getRequestToken signature', signature)
    // const { data } = await axios.post('https://api.twitter.com/oauth/request_token', {
    //   oauth_callback: 'http%3A%2F%2F127.0.0.1%3A3333%2Ftwitter%2Fcallback'
    // }, {
    //   headers: {
    //     'Authorization ': `OAuth oauth_nonce="K7ny27JTpKVsTgdyLdDfmQQWVLERj2zAK5BslRsqyw", oauth_callback="http%3A%2F%2F127.0.0.1%3A3333%2Ftwitter%2Fcallback", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1722803476", oauth_consumer_key="ZHN2aFRnZjlkczNaZ3dONWp4THM6MTpjaQ", oauth_signature="${signature}", oauth_version="1.0"`
    //   }
    // })
    // console.log('Twitter::getRequestToken data', data)
  }

  public async twitterCallback({}: HttpContextContract) {
    console.log('in Twitter::twitterCallback')
  }
}
