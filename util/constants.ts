import Env from '@ioc:Adonis/Core/Env'

export const BASE_MAINNET_CONFIG = {
  IS_RELEVANT_X_ATOM: '11359', // both incorrect!
  IS_ATOMS: ['45', '11995'], // both incorrect!
}

export const BASE_SEPOLIA_CONFIG = {
  IS_RELEVANT_X_ATOM: '11359',
  IS_ATOMS: ['45', '11995'],
}

export const CONFIG = Env.get('NODE_ENV') === 'production' ? BASE_MAINNET_CONFIG : BASE_SEPOLIA_CONFIG
