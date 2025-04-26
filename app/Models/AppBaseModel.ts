import { BaseModel } from '@ioc:Adonis/Lucid/Orm'
import { CamelCaseNamingStrategy } from '../Strategies/CamelCaseNamingStrategy.ts'

export default class AppBaseModel extends BaseModel {
  public static namingStrategy = new CamelCaseNamingStrategy()
}