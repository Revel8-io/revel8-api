import { column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Atom from './Atom'
import { DateTime } from 'luxon'
import AppBaseModel from './AppBaseModel'

// id, atom_id, contents, contents_attempts, image_attempts, image_hash, image_filename, created_at, updated_at

export default class AtomIpfsData extends AppBaseModel {
  public static table = 'AtomIpfsData'
  public static hidden = ['imageFilename', 'imageAttempts', 'contentsAttempts']

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'atomId' })
  public atomId: number

  @belongsTo(() => Atom, {
    foreignKey: 'atomId',
    localKey: 'id'
  })
  public atom: BelongsTo<typeof Atom>

  @column({ columnName: 'contents' })
  public contents: any

  @column({ columnName: 'contentsAttempts' })
  public contentsAttempts: number

  @column({ columnName: 'imageAttempts' })
  public imageAttempts: number

  @column({ columnName: 'imageHash' })
  public imageHash: string | null

  @column({ columnName: 'imageFilename' })
  public imageFilename: string | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime | null

}
