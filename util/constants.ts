import Env from '@ioc:Adonis/Core/Env'

export const BASE_MAINNET_CONFIG = {
  IS_RELEVANT_X_ATOM: 11359, // both incorrect!
  IS_RELEVANT_X_TRIPLE: 45, // both incorrect!
}

export const BASE_SEPOLIA_CONFIG = {
  IS_RELEVANT_X_ATOM: 11359,
  IS_RELEVANT_X_TRIPLE: 45,
}

export const CONFIG = Env.get('NODE_ENV') === 'production' ? BASE_MAINNET_CONFIG : BASE_SEPOLIA_CONFIG
