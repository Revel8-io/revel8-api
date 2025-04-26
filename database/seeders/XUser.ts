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
        existingIds.includes(item.userId) ||
        existingUsernames.includes(item.username)
      ) {
        return false
      }
      existingIds.push(item.userId)
      existingUsernames.push(item.username)
      return true
    })

    // insert into database
    for (const item of filteredJsonData) {
      // console.log('inserting', item)
      await Database.table('XComUsers').insert(item)
      try {
      } catch (error) {
        console.log('error', error)
      }
    }
  }
}
