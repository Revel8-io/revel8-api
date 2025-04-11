import { column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import AppBaseModel from './AppBaseModel'
import Vault from './Vault'

export default class Position extends AppBaseModel {
  public static table = 'Position'

  @column({ isPrimary: true })
  public id: string

  @column({ columnName: 'accountId' })
  public accountId: string

  @column({ columnName: 'vaultId' })
  public vaultId: string

  @belongsTo(() => Vault, {
    foreignKey: 'vaultId',
    localKey: 'id'
  })
  public vault: BelongsTo<typeof Vault>

  @column({ columnName: 'shares' })
  public shares: string
}
