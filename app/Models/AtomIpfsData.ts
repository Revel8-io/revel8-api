import { BaseModel, column, belongsTo, BelongsTo, computed } from '@ioc:Adonis/Lucid/Orm'
import Atom from './Atom'
import { DateTime } from 'luxon'

// id, atom_id, contents, contents_attempts, image_attempts, image_hash, image_filename, created_at, updated_at

export default class AtomIpfsData extends BaseModel {
  public static table = 'atom_ipfs_data'
  public serializeExtras = true
  public static hidden = ['image_filename', 'image_attempts', 'contents_attempts']

  @column({ isPrimary: true })
  public id: number

  @column()
  public atom_id: number

  @belongsTo(() => Atom, {
    foreignKey: 'atom_id',
    localKey: 'id'
  })
  public atom: BelongsTo<typeof Atom>

  @column()
  public contents: any

  @column({ serializeAs: null })
  public contents_attempts: number

  @column({ serializeAs: null })
  public image_attempts: number

  @column({ serializeAs: null })
  public image_hash: string | null

  @column({ serializeAs: null })
  public image_filename: string | null

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime | null

  public serializeKey(key: string) {
    return key
  }
}
