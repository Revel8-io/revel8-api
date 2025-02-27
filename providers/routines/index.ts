import { PinataSDK } from "pinata-web3";
import Env from '@ioc:Adonis/Core/Env'
import axios from "axios";
import { uploadIterator } from "App/Controllers/Http/IpfsController";
import fs from 'fs/promises'
const PINATA_GATEWAY_KEY = Env.get('PINATA_GATEWAY_KEY')

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

// export const watchForUpdates = async () => {
//   const { Client } = require('pg');
//   const PG_USER = Env.get('PG_USER')
//   const PG_PASSWORD = Env.get('PG_PASSWORD')
//   const PG_HOST = Env.get('PG_HOST')
//   const PG_PORT = Env.get('PG_PORT')
//   const PG_DB_NAME = Env.get('PG_DB_NAME')
//   const connectionString = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB_NAME}`
//   const client = new Client({
//     connectionString,
//   });

//   client.connect();

//   client.on('notification', (msg) => {
//     console.log('Notification received:', msg.payload);
//     // const data = JSON.parse(msg.payload);
//     // Handle the notification (e.g., send a WebSocket update)
//   });

//   // listen to updates for atom_ipfs_data table
//   client.query('LISTEN table_update');
// }

export const populateIPFSContent = async () => {
  uploadIterator().iterate()
  const { default: Database } = await import('@ioc:Adonis/Lucid/Database')
  const { default: Redis } = await import('@ioc:Adonis/Addons/Redis')
  const { default: Env } = await import('@ioc:Adonis/Core/Env')

  // select all rows from Atoms and right join to atom_ipfs_data
  // on atoms.id = atom_ipfs_data.atom_id
  // where atoms.data is like 'ipfs://' or starts with 'Qm' and atom_ipfs_data.contents is null
  // for each row, get the contents from the ipfs url and store it in atom_ipfs_data.contents
  // update atom_ipfs_data with the new contents
  try {
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
      query
        .whereNull('atom_ipfs_data.contents')
        .orWhere('atom_ipfs_data.contents', '{}')
    })
    .where(query => {
      query.where('atom_ipfs_data.contents_attempts', '<', 5)
      .orWhereNull('atom_ipfs_data.contents_attempts')
    })
    .orderBy('Atom.id', 'asc')

    if (rows.length > 0) {
      console.log('[CONTENTS] pending IPFS upload indexing rows.length', rows.length)
    }
    // if (rows.length === 0) {
    //   console.log('search results are empty, waiting 500ms')
    //   setTimeout(populateIPFSContent, 500)
    //   return
    // }
    const PINATA_GATEWAY_KEY = Env.get('PINATA_GATEWAY_KEY')

    const fetchIPFSContent = async (row: any) => {
      let hash = ''
      hash = row.data.split('/').pop()
      console.log('[CONTENTS] hash', hash)

      const { data } = await axios.get(`https://blush-legal-emu-115.mypinata.cloud/ipfs/${hash}`, {
        params: {
          pinataGatewayToken: PINATA_GATEWAY_KEY
        },
        timeout: 10000 // 10 seconds timeout
      })

      return data
    }

    const processRow = async (row: any) => {
      let data
      let isError = false
      // console.log('row', row.atom_table_id, row.data, row.contents_attempts)
      try {
        data = await fetchIPFSContent(row)
      } catch (err) {
        console.error('[CONTENTS] Error getting data from Atom.id', row.atom_table_id, err.message)
        isError = true
        // console.log('err.response.status', err.response?.status)
        if (err.response?.status === 429) {
          console.log('[CONTENTS] Rate limit exceeded, sleeping for 10 seconds')
          return await sleep(30000)
        }
      }
      // console.log('data', data)
      // console.log('typeof data', typeof data)

      const existingContentsRowForAtom = await Database.query()
        .from('atom_ipfs_data')
        .where('atom_id', row.atom_table_id)
      // console.log('existingRows.length', existingRows.length)

      let contents = data
      // console.log('data', typeof data, data)
      if (typeof data !== 'object' || Array.isArray(data)) {
        contents = {}
      }
      if (data?.content) {
        let moreContent
        try {
          moreContent = JSON.parse(data.content)
        } catch (err) {
          moreContent = data.content
        }
        contents = { filename: data.name, ...moreContent }
      }
      try {
        if (existingContentsRowForAtom.length > 0) {
          await Database.query()
            .from('atom_ipfs_data')
            .where('atom_id', row.atom_table_id)
            .update({ contents, contents_attempts: isError ? existingContentsRowForAtom[0].contents_attempts + 1 : 1 });
        } else {
          await Database
            .insertQuery()
            .table('atom_ipfs_data')
            .insert({ atom_id: row.atom_table_id, contents });
        }
      } catch (err) {
        // console.log('data type', typeof data, data)')
        console.error('[CONTENTS] Error inserting or updating atom_ipfs_data', err, row, existingContentsRowForAtom)
      }
    }

    // New concurrent processing implementation
    const concurrentLimit = 5;
    const queue = rows.slice(); // Create a copy of the rows array
    const activePromises = new Set();

    const processNext = async () => {
      console.log('[CONTENTS] processing next')
      // if (queue.length === 0) {
      //   console.log('queue is empty, waiting 500ms')
      //   setTimeout(populateIPFSContent, 500)
      //   return;
      // }

      const row = queue.shift()!;
      if (!row) return
      const promise = processRow(row)
        .catch(err => console.log('[CONTENTS] failed to process row', row.atom_table_id, err.message))
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
  } catch (err) {
    console.error('[CONTENTS] Error populating IPFS content', err)
  } finally {
    setTimeout(populateIPFSContent, 1000)
  }
}

export const populateImageFiles = async () => {
  const { default: Database } = await import('@ioc:Adonis/Lucid/Database')
  const { default: Redis } = await import('@ioc:Adonis/Addons/Redis')
  const { default: Env } = await import('@ioc:Adonis/Core/Env')

  // select all rows from Atoms and right join to atom_ipfs_data
  // on atoms.id = atom_ipfs_data.atom_id
  // where atoms.data is like 'ipfs://' or starts with 'Qm' and atom_ipfs_data.contents is null
  // for each row, get the contents from the ipfs url and store it in atom_ipfs_data.contents
  // update atom_ipfs_data with the new contents

  // now need to read files from directory and see which are missing from atom_ipfs_data.image_hash

  try {
    const rows = await Database.from('atom_ipfs_data')
      .whereNull('image_filename')
      .andWhereNot('contents', '{}')
      .andWhere('image_attempts', '<', 5)
      .orderBy('atom_id', 'asc')

      const files = await fs.readdir('public/img/atoms')
      if (rows.length) {
      console.log('[IMAGES] image hashes needing downloading', rows.length)
      console.log('[IMAGES] image files.length', files.length)
    }

    if (rows.length > 0) {
      console.log('[IMAGES] pending contents image backups rows.length', rows.length)
    }

    const processRow = async (row: any) => {
      const { contents } = row
      const imageUrl = contents.image || contents.image_url || contents.xAvatarUrl || contents.avatarUrl || contents.avatar_url
      if (!imageUrl) {
        await Database.from('atom_ipfs_data').where('atom_id', row.atom_id)
          .update({ image_attempts: 5 })
        return
      }
      // fetch the image and then save it to the public/img/atoms directory

      try {
        const filename = `${row.atom_id}.${imageUrl.split('.').pop()}`
        const filenameWithoutParams = filename.split('?')[0].split('&')[0]
        const { data } = await axios.get(imageUrl, {
          responseType: 'arraybuffer'
        })
        await fs.writeFile(`public/img/atoms/${filenameWithoutParams}`, data)
        await Database.from('atom_ipfs_data').where('atom_id', row.atom_id)
          .update({ image_filename: filenameWithoutParams })
      } catch (err) {
        console.error('[IMAGES] Error downloading atom image', row.atom_id, err.message)
        await Database.from('atom_ipfs_data').where('atom_id', row.atom_id)
          .update({ image_attempts: row.image_attempts + 1 })
      }
    }

    // New concurrent processing implementation
    const concurrentLimit = 5;
    const queue = rows.slice(); // Create a copy of the rows array
    const activePromises = new Set();

    const processNext = async () => {
      // if (queue.length === 0) {
        //   console.log('queue is empty, waiting 500ms')
        //   setTimeout(populateIPFSContent, 500)
        //   return;
        // }

        const row = queue.shift()!;
        console.log('[IMAGES] processing next', row.atom_id)
      if (!row) return
      const promise = processRow(row)
        .catch(err => console.error('[IMAGES] Failed to process row:', err))
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
  } catch (err) {
    console.error('[IMAGES] Error saving image files:', err)
  } finally {
    setTimeout(populateImageFiles, 1000)
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
