import { column, HasOne, hasOne, BelongsTo, belongsTo } from '@ioc:Adonis/Lucid/Orm'
import Atom from './Atom'
import Triple from './Triple'
import AppBaseModel from './AppBaseModel'

// id, atomId, tripleId, totalShares, currentSharePrice, positionCount
export default class Vault extends AppBaseModel {
  public static table = 'Vault'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'atomId' })
  public atomId: number

  @hasOne(() => Atom, { foreignKey: 'id', localKey: 'atomId' })
  public atom: HasOne<typeof Atom>

  @column({ columnName: 'tripleId' })
  public tripleId: number

  @belongsTo(() => Triple, { foreignKey: 'id', localKey: 'tripleId' })
  public triple: BelongsTo<typeof Triple>

  @column({ columnName: 'totalShares' })
  public totalShares: number

  @column({ columnName: 'currentSharePrice' })
  public currentSharePrice: number

  @column({ columnName: 'positionCount' })
  public positionCount: number
}
