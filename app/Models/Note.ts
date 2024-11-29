import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Note extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public author: string

  @column()
  public target: string

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
