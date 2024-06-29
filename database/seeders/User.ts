import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import User from 'App/Models/User'

export default class extends BaseSeeder {
  public async run () {
    // create user with id: 1, username: 'smilingkylan'
    await User.create({
      id: 1,
      username: 'smilingkylan'
    })
  }
}
