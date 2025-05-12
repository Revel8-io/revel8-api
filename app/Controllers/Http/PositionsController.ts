import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Position from '../../Models/Position'
import Triple from 'App/Models/Triple'
import Vault from 'App/Models/Vault'

export default class PositionsController {
  public async getPositionsByTripleId({ request, response }: HttpContextContract) {
    // get sort and orderBy and page from query
    const { page } = request.qs()
    const tripleId = request.param('tripleId')
    console.log('getPositionsByTripleId', {
      tripleId,
      page
    })

    const [triple] = await Triple.query()
      .where('id', tripleId)
      .preload('vault')

    const vaultPromise = Vault.query()
      .where('id', triple.vaultId)

    const counterVaultPromise = Vault.query()
      .where('id', triple.counterVaultId)

    // Get positions for the vault with pagination
    const positionsPromise = Position.query()
      .where('vaultId', triple.vaultId)
      .orderBy('shares', 'desc')
      .paginate(page || 1, 80)

    const maxSharePositionPromise = Position.query()
      .where('vaultId', triple.vaultId)
      .orderBy('shares', 'desc')
      .first()

    const counterPositionsPromise = Position.query()
      .where('vaultId', triple.counterVaultId)
      .preload('vault')
      .orderBy('shares', 'desc')
      .paginate(page || 1, 80)

    const maxShareCounterPositionPromise = Position.query()
      .where('vaultId', triple.counterVaultId)
      .orderBy('shares', 'desc')
      .first()

    const [positions, maxSharePosition, counterPositions, maxShareCounterPosition, vaults, counterVaults] = await Promise.all([
      positionsPromise,
      maxSharePositionPromise,
      counterPositionsPromise,
      maxShareCounterPositionPromise,
      vaultPromise,
      counterVaultPromise
    ])
    console.log('getPositionsByTripleId', {
      maxSharePosition,
      maxShareCounterPosition,

    })
    // Attach the totalShares max value from the vault
    const result = positions.toJSON()
    const counterResult = counterPositions.toJSON()
    return response.json({
      vault: vaults[0],
      counterVault: counterVaults[0],
      positions: result,
      counterPositions: counterResult,
      maxSharePosition: maxSharePosition?.shares,
      maxShareCounterPosition: maxShareCounterPosition?.shares,
    })
  }

  public async getPositionsByAtomId({ request, response }: HttpContextContract) {
    // get sort and orderBy and page from query
    const { page } = request.qs()
    const atomId = request.param('atomId')

    // Get positions for the vault with pagination
    const positionsPromise = Position.query()
      .where('vaultId', atomId)
      .preload('vault')
      .orderBy('shares', 'desc')
      .paginate(page || 1, 80)

    const maxSharePositionPromise = Position.query()
      .where('vaultId', atomId)
      .orderBy('shares', 'desc')
      .first()

    const [positions, maxSharePosition] = await Promise.all([
      positionsPromise,
      maxSharePositionPromise,
    ])

    // Attach the totalShares max value from the vault
    const result = positions.toJSON()
    return response.json({
      positions: result,
      maxSharePosition: maxSharePosition?.shares,
    })
  }

  // positions/vault/:vaultId
  public async getPositionsByVaultId({ request, response }: HttpContextContract) {
    // get sort and orderBy and page from query
    const { page } = request.qs()
    const vaultId = request.param('vaultId')

    // Get positions for the vault with pagination
    const positionsPromise = Position.query()
      .where('vaultId', vaultId)
      .preload('vault')
      .orderBy('shares', 'desc')
      .paginate(page || 1, 80)

    const maxSharePositionPromise = Position.query()
      .where('vaultId', vaultId)
      .orderBy('shares', 'desc')
      .first()

    const triplePromise = Triple.query()
    .where('vaultId', vaultId)
    .preload('vault')


    const [positions, maxSharePosition, tripleList] = await Promise.all([positionsPromise, maxSharePositionPromise, triplePromise])
    const [triple] = tripleList

    const counterPositionsPromise = Position.query()
      .where('vaultId', triple.counterVaultId)
      .preload('vault')
      .orderBy('shares', 'desc')
      .paginate(page || 1, 80)

    const maxShareCounterPositionPromise = Position.query()
      .where('vaultId', triple.counterVaultId)
      .orderBy('shares', 'desc')
      .first()

    const [counterPositions, maxShareCounterPosition] = await Promise.all([counterPositionsPromise, maxShareCounterPositionPromise])

    // Attach the totalShares max value from the vault
    const result = positions.toJSON()
    const counterResult = counterPositions.toJSON()
    return response.json({
      positions: result,
      maxSharePosition: maxSharePosition?.shares,
      counterPositions: counterResult,
      maxShareCounterPosition: maxShareCounterPosition?.shares
    })
  }

  getPositionsByTripleIdAndAccountId = async ({ request, response }: HttpContextContract) => {
    const { tripleId, accountId } = request.params()

    // get vault and counterVaults for the triple
    const triple = await Triple.find(tripleId)
    const vault = await Vault.find(triple?.vaultId)
    const counterVault = await Vault.find(triple?.counterVaultId)

    if (!vault) return response.status(404).json({ error: 'Vault not found' })
    if (!counterVault) return response.status(404).json({ error: 'Counter vault not found (may not be a triple)' })
    // get positions for the vault
    const accountPositions = await Position.query()
      .whereIn('vaultId', [vault.id, counterVault.id])
      .whereIn('accountId', [accountId, accountId.toLowerCase()])
      .preload('vault')
      .orderBy('shares', 'desc')

    return response.json({
      positions: accountPositions,
    })
  }
}
