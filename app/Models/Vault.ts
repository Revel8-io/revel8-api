import { BaseModel, column, HasOne, hasOne } from '@ioc:Adonis/Lucid/Orm'
import Atom from './Atom'

// id, atomId, tripleId, totalShares, currentSharePrice, positionCount
export default class Vault extends BaseModel {
  public static table = 'Vault'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'atomId' })
  public atomId: number

  @hasOne(() => Atom, { foreignKey: 'id', localKey: 'atomId' })
  public atom: HasOne<typeof Atom>

  @column({ columnName: 'tripleId' })
  public tripleId: number

  @column({ columnName: 'totalShares' })
  public totalShares: number

  @column({ columnName: 'currentSharePrice' })
  public currentSharePrice: number

  @column({ columnName: 'positionCount' })
  public positionCount: number
}
