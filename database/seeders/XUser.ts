import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs/promises'

let existingIds = []
let existingUsernames = []
export default class extends BaseSeeder {
  public async run () {
    // read AtomIpfsData.json
    const data = await fs.readFile('xUsers.json', 'utf8')
    const jsonData = JSON.parse(data)
    // remove array objects with duplicate id value
    const filteredJsonData = jsonData.filter((item: any) => {
      if (
        existingIds.includes(item.x_user_id) ||
        existingUsernames.includes(item.x_username)
      ) {
        return false
      }
      existingIds.push(item.x_user_id)
      existingUsernames.push(item.x_username)
      return true
    })

    // insert into database
    for (const item of filteredJsonData) {
      console.log('inserting', item)
      try {
        await Database.table('x_users').insert(item)
      } catch (error) {
        console.log('error', error)
      }
    }
  }
}
