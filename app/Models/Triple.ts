import { BaseModel, column, HasOne, hasOne } from '@ioc:Adonis/Lucid/Orm'
import Atom from './Atom'

// id, creatorId, subjectId, predicateId, label, vaultId, counterVaultId, blockNumber, blockTimestamp, transactionHash

export default class Triple extends BaseModel {
  public static table = 'Triple'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'creatorId' })
  public creatorId: string

  @column({ columnName: 'subjectId' })
  public subjectId: number

  @hasOne(() => Atom, { foreignKey: 'id', localKey: 'subjectId' })
  public subject: HasOne<typeof Atom>

  @column({ columnName: 'predicateId' })
  public predicateId: number

  @hasOne(() => Atom, { foreignKey: 'id', localKey: 'predicateId' })
  public predicate: HasOne<typeof Atom>


  @column({ columnName: 'objectId' })
  public objectId: number

  @hasOne(() => Atom, { foreignKey: 'id', localKey: 'objectId' })
  public object: HasOne<typeof Atom>

  // @column()
  // public label: string

  @column({ columnName: 'vaultId' })
  public vaultId: number

  @column({ columnName: 'counterVaultId' })
  public counterVaultId: number

  @column({ columnName: 'blockNumber' })
  public blockNumber: number

  @column({ columnName: 'blockTimestamp' })
  public blockTimestamp: number

  @column({ columnName: 'transactionHash' })
  public transactionHash: Buffer
}
