import { CONFIG } from "../../common/constants/web3";
import { Multivault } from "../../common/util/multivault";
import { createPublicClient, createWalletClient, http } from 'viem'

const publicClient = createPublicClient({
  chain: CONFIG.CHAIN,
  transport: http()
})

const walletClient = createWalletClient({
  chain: CONFIG.CHAIN,
  transport: http()
})

const MultiVaultInstance = new Multivault({publicClient, walletClient})

export const getContractConfig = async () => {
  const { default: Redis } = await import('@ioc:Adonis/Addons/Redis')
  const generalConfig = await MultiVaultInstance.getGeneralConfig()
  const vaultFees = await MultiVaultInstance.getVaultFees()
  const atomConfig = await MultiVaultInstance.getAtomConfig()
  const tripleConfig = await MultiVaultInstance.getTripleConfig()
  const atomCost = await MultiVaultInstance.getAtomCost()
  const tripleCost = await MultiVaultInstance.getTripleCost()

  const output = {
    generalConfig,
    vaultFees,
    atomConfig,
    tripleConfig,
    atomCost,
    tripleCost
  }
  const adjustedOutput = Object.fromEntries(
    Object.entries(output).map(([key, value]) => {
      if (typeof value === 'object') {
        return [key, Object.fromEntries(
          Object.entries(value).map(([key, value]) => {
            return [key, typeof value === 'bigint' ? value.toString() : value]
          })
        )]
      }
      return (
        [key, typeof value === 'bigint' ? value.toString() : value]
      )
    })
  )
  // run every 60 minutes
  await Redis.set(`${CONFIG.CHAIN_KEY}|contractConfig`, JSON.stringify(adjustedOutput))
  setTimeout(getContractConfig, 60 * 1000 * 60)
}

