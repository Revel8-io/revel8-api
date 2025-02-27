import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import atomIpfsData from '../../atomIpfsData.json'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs/promises'

let existingIds = []

export default class extends BaseSeeder {
  public async run () {
    // read AtomIpfsData.json
    const data = await fs.readFile('atomIpfsData.json', 'utf8')
    const jsonData = JSON.parse(data)
    // remove array objects with duplicate id value
    const filteredJsonData = jsonData.filter((item: any) => {
      if (existingIds.includes(item.id)) {
        return false
      }
      existingIds.push(item.id)
      return true
    })

    // insert into database
    for (const item of filteredJsonData) {
      // console.log('inserting', item)
      try {
        await Database.table('atom_ipfs_data').insert(item)
      } catch (error) {
        console.log('error', error)
      }
    }
  }
}
