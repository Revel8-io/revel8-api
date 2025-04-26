import { column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import AppBaseModel from './AppBaseModel'
import Atom from './Atom'
import Triple from './Triple'

export default class Signal extends AppBaseModel {
  public static table = 'Signal'

  @column({ isPrimary: true })
  public id: string

  @column({ columnName: 'delta' })
  public delta: number

  @column({ columnName: 'relativeStrength' })
  public relativeStrength: number

  @column({ columnName: 'accountId' })
  public accountId: string

  @column({ columnName: 'atomId' })
  public atomId: number | null

  @belongsTo(() => Atom, {
    foreignKey: 'atomId',
  })
  public atom: BelongsTo<typeof Atom>

  @column({ columnName: 'tripleId' })
  public tripleId: number | null

  @belongsTo(() => Triple, {
    foreignKey: 'tripleId',
  })
  public triple: BelongsTo<typeof Triple>

  @column({ columnName: 'depositId' })
  public depositId: string | null

  @column({ columnName: 'redemptionId' })
  public redemptionId: string | null

  @column({ columnName: 'blockNumber' })
  public blockNumber: number

  @column({ columnName: 'blockTimestamp' })
  public blockTimestamp: number

  @column({ columnName: 'transactionHash' })
  public transactionHash: Buffer
}
