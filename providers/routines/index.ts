import { PinataSDK } from "pinata-web3";
import Env from '@ioc:Adonis/Core/Env'
import axios from "axios";

export const pinata = new PinataSDK({
  pinataJwt: Env.get('PINATA_JWT'),
  pinataGateway: Env.get('PINATA_GATEWAY')
});

pinata.testAuthentication().then(resp => {
  console.log('resp', resp)
})

export const testPinataAuth = async () => {
  const { data } = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
    headers: {
      'authorization': `Bearer ${Env.get('PINATA_JWT')}`,
      accept: 'application/json'
    }
  })
  console.log('message', data)
}

export const populateIPFSContent = async () => {
  // testPinataAuth()
  console.log('populateIPFSContent')
  const { default: Database } = await import('@ioc:Adonis/Lucid/Database')
  const { default: Redis } = await import('@ioc:Adonis/Addons/Redis')
  const { default: Env } = await import('@ioc:Adonis/Core/Env')

  // select all rows from Atoms and right join to atom_ipfs_data
  // on atoms.id = atom_ipfs_data.atom_id
  // where atoms.data is like 'ipfs://' or starts with 'Qm' and atom_ipfs_data.contents is null
  // for each row, get the contents from the ipfs url and store it in atom_ipfs_data.contents
  // update atom_ipfs_data with the new contents

  const rows = await Database
  .from('Atom')
  .select('Atom.*', 'atom_ipfs_data.*', 'Atom.id as atom_table_id')
  .fullOuterJoin('atom_ipfs_data', 'Atom.id', 'atom_ipfs_data.atom_id')
  .where((query) => {
    query
      .where('Atom.data', 'like', 'ipfs://%')
      .orWhere('Atom.data', 'like', 'Qm%')
      .orWhere('Atom.data', 'like', 'bafk%')
  })
  .whereNull('atom_ipfs_data.contents')
  .where(query => {
    query.where('atom_ipfs_data.attempts', '<', 5)
    .orWhereNull('atom_ipfs_data.attempts')
  })
  .orderBy('Atom.id', 'asc')

  console.log('rows.length', rows.length)

  const pinataGatewayKey = Env.get('PINATA_GATEWAY_KEY')
  console.log('pinataGatewayKey', pinataGatewayKey)

  const fetchIPFSContent = async (row: any) => {
    let hash = ''
    hash = row.data.split('/').pop()
    console.log('hash', hash)

    const { data } = await axios.get(`https://blush-legal-emu-115.mypinata.cloud/ipfs/${hash}`, {
      params: {
        pinataGatewayToken: pinataGatewayKey
      },
      timeout: 10000 // 10 seconds timeout
    })

    return data
  }

  const processRow = async (row: any) => {
    let contents
    let isError = false
    let is429 = false
    console.log('row', row.atom_table_id, row.data, row.attempts)
    try {
      contents = await fetchIPFSContent(row)
    } catch (err) {
      console.error('Error getting contents from Atom.id', row.atom_table_id, err.message)
      isError = true
      // console.log('err.response.status', err.response?.status)
      if (err.response?.status === 429) {
        console.log('Rate limit exceeded, sleeping for 10 seconds')
        is429 = true
      }
    } finally {
      const existingRows = await Database.query()
        .from('atom_ipfs_data')
        .where('atom_id', row.atom_table_id)
      // console.log('existingRows.length', existingRows.length)

      if (existingRows.length > 0) {
        await Database.query()
          .from('atom_ipfs_data')
          .where('atom_id', row.atom_table_id)
          .update({ contents, attempts: isError ? existingRows[0].attempts + 1 : 1 });
        console.log('finished updating')
      } else {
        await Database
          .insertQuery()
          .table('atom_ipfs_data')
          .insert({ atom_id: row.atom_table_id, contents });
        console.log('finished inserting')
      }
      if (is429) {
        await sleep(30000)
      }
    }
  }

  // New concurrent processing implementation
  const concurrentLimit = 5;
  const queue = rows.slice(); // Create a copy of the rows array
  const activePromises = new Set();

  const processNext = async () => {
    if (queue.length === 0) return;

    const row = queue.shift()!;
    const promise = processRow(row)
      .catch(err => console.error('Failed to process row:', err))
      .finally(() => {
        activePromises.delete(promise);
        // Process next item if queue is not empty
        if (queue.length > 0) {
          processNext();
        }
      });

    activePromises.add(promise);
  };

  // Initialize processing with concurrentLimit items
  for (let i = 0; i < Math.min(concurrentLimit, rows.length); i++) {
    await sleep(1000)
    processNext();
  }

  // Wait for all processing to complete
  while (activePromises.size > 0) {
    await Promise.race(activePromises);
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
