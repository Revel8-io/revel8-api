import { DateTime } from 'luxon'
import { column } from '@ioc:Adonis/Lucid/Orm'
import AppBaseModel from './AppBaseModel'

export default class Note extends AppBaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public author: string

  @column()
  public target: string

  @column()
  public targetId: string
  @column()
  public note: string

  @column()
  public relatedTweetUrl: string

  @column()
  public relatedTweetId: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
