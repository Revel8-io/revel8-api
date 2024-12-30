export type AccessTokenResponse = {
  token_type: string
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}

export type UserDataResponse = {
  data: {
    id: string
    name: string
    username: string
  }
}
