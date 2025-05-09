import { column, hasMany, HasMany, HasOne, hasOne } from '@ioc:Adonis/Lucid/Orm'
import Vault from './Vault'
import AtomIpfsData from './AtomIpfsData'
import AppBaseModel from './AppBaseModel'
import Triple from './Triple'
// id, walletId, creatorId, vaultId, data, type, emoji, label, image, valueId, blockNumber, blockTimestamp, transactionHash

export default class Atom extends AppBaseModel {
  public static table = 'Atom'

  @column({ isPrimary: true })
  public id: number

  @hasOne(() => AtomIpfsData, { foreignKey: 'atomId', localKey: 'id' })
  public atomIpfsData: HasOne<typeof AtomIpfsData>

  @column({ columnName: 'walletId' })
  public walletId: string

  @column({ columnName: 'creatorId' })
  public creatorId: string

  @column({ columnName: 'vaultId' })
  public vaultId: number

  @hasOne(() => Vault, { foreignKey: 'atomId', localKey: 'id' })
  public vault: HasOne<typeof Vault>

  @column({ columnName: 'data' })
  public data: string

  @hasMany(() => Triple, {
    foreignKey: 'subjectId',
    localKey: 'id',
  })
  public subjectTriples: HasMany<typeof Triple>

  @hasMany(() => Triple, {
    foreignKey: 'predicateId',
    localKey: 'id',
  })
  public predicateTriples: HasMany<typeof Triple>

  @hasMany(() => Triple, {
    foreignKey: 'objectId',
    localKey: 'id',
  })
  public objectTriples: HasMany<typeof Triple>

  @column({ columnName: 'type' })
  public type: string

  @column({ columnName: 'emoji' })
  public emoji: string

  @column({ columnName: 'label' })
  public label: string

  @column({ columnName: 'image' })
  public image: string

  @column({ columnName: 'valueId' })
  public valueId: number

  @column({ columnName: 'blockNumber' })
  public blockNumber: number

  @column({ columnName: 'blockTimestamp' })
  public blockTimestamp: number

  @column({ columnName: 'transactionHash' })
  public transactionHash: Buffer

  // Convert to hexadecimal string (most common for transaction hashes)
  public get transactionHashString(): string {
    return this.transactionHash.toString('hex')
  }
}
