import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Position from '../../Models/Position'

export default class PositionsController {
  // positions/vault/:vaultId
  public async getPositionsByVaultId({ request, response }: HttpContextContract) {
    // get sort and orderBy and page from query
    const { page } = request.qs()
    const vaultId = request.param('vaultId')

    // Get positions for the vault with pagination
    const positions = await Position.query()
      .where('vaultId', vaultId)
      .preload('vault')
      .orderBy('shares', 'desc')
      .paginate(page || 1, 80)

    // now find the position with the highest shares
    const maxSharePosition = await Position.query()
      .where('vaultId', vaultId)
      .orderBy('shares', 'desc')
      .first()

    // Attach the totalShares max value from the vault
    const result = positions.toJSON()
    return response.json({
      positions: result,
      maxSharePosition: maxSharePosition?.shares
    })
  }
}
