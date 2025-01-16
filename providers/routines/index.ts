import { PinataSDK } from "pinata-web3";
import Env from '@ioc:Adonis/Core/Env'

export const pinata = new PinataSDK({
  pinataJwt: Env.get('PINATA_JWT'),
  pinataGateway: Env.get('PINATA_GATEWAY'),
  pinataGatewayKey: Env.get('PINATA_GATEWAY_KEY'),
});

export const testPinataAuth = async () => {
  const { message } = await pinata.testAuthentication()
  console.log('message', message)
}

export const populateIPFSContent = async () => {
  testPinataAuth()
  console.log('populateIPFSContent')
  const { default: Database } = await import('@ioc:Adonis/Lucid/Database')
  const { default: Redis } = await import('@ioc:Adonis/Addons/Redis')
  const { default: Env } = await import('@ioc:Adonis/Core/Env')

  // select all rows from Atoms and right join to atom_ipfs_data
  // on atoms.id = atom_ipfs_data.atom_id
  // where atoms.data is like 'ipfs://' or starts with 'Qm' and atom_ipfs_data.contents is null
  // for each row, get the contents from the ipfs url and store it in atom_ipfs_data.contents
  // update atom_ipfs_data with the new contents

  const rows = await Database.from('Atom')
    .select('Atom.*', 'atom_ipfs_data.*', 'Atom.id as atom_table_id')
    .fullOuterJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
    .where('Atom.data', 'like', 'ipfs://%')
    .orWhere('Atom.data', 'like', 'Qm%')
    .andWhereNull('atom_ipfs_data.contents')

  console.log('rows.length', rows.length)

  const fetchIPFSContent = async (row: any) => {
    return new Promise(async (resolve, reject) => {
      let hash = ''
      setTimeout(reject, 10000)
      try {
        setTimeout(reject, 10000)
        hash = row.data.split('/').pop()
        const contents = await pinata.gateways.get(hash)
        resolve(contents)
      } catch (_err) {
        console.error('Error getting contents from IPFS', hash)
        reject()
      } finally {
        resolve(void 0)
      }
    })
  }

  for (const row of rows) {
    console.log('row', row)
    try {
      const contents = await fetchIPFSContent(row)
        // insert the contents into atom_ipfs_data
        console.log('row.id', row.id)
        const existingRows  = await Database.query().from('atom_ipfs_data').where('atom_id', row.atom_table_id)
        console.log('existingRows.length', existingRows.length)
        if (existingRows.length > 0) {
          // update existing row
          await Database.query()
            .from('atom_ipfs_data')
            .where('atom_id', row.atom_table_id)
            .update({ contents });
          console.log('finished updating')
        } else {
          await Database
            .insertQuery()
            .table('atom_ipfs_data')
            .insert({ atom_id: row.atom_table_id, contents });
          console.log('finished inserting')
        }
    } catch (err) {
      console.error('Error getting contents from IPFS', err)
    }
  }



  // Semaphore implementation to limit concurrent operations
//   class Semaphore {
//     private running = 0;
//     private queue: (() => void)[] = [];

//     constructor(private maxConcurrent: number) {}

//     async acquire(): Promise<void> {
//       if (this.running < this.maxConcurrent) {
//         this.running++;
//         return;
//       }

//       return new Promise<void>(resolve => {
//         this.queue.push(resolve);
//       });
//     }

//     release(): void {
//       this.running--;
//       const next = this.queue.shift();
//       if (next) {
//         this.running++;
//         next();
//       }
//     }
//   }

//   const semaphore = new Semaphore(5);
//   const promises = rows.map(async (row) => {
//     await semaphore.acquire();
//     let hash = ''
//     try {
//       hash = row.data.split('/').pop()
//       const contents = await pinata.gateways.get(hash)
//       // insert the contents into atom_ipfs_data
//       const existingRows  = await Database.query().from('atom_ipfs_data').where('atom_id', row.id)
//       console.log('existingRows.length', existingRows.length)
//       if (existingRows.length > 0) {
//         // update existing row
//         await Database.query()
//           .from('atom_ipfs_data')
//           .where('atom_id', row.id)
//           .update({ contents });
//         console.log('finished updating')
//       } else {
//         await Database
//           .insertQuery()
//           .table('atom_ipfs_data')
//           .insert({ atom_id: row.id, contents });
//         console.log('finished inserting')
//       }
//     } catch (_err) {
//       console.error('Error getting contents from IPFS', hash)
//     } finally {
//       semaphore.release();
//     }
//   });

//   await Promise.all(promises);
// }

