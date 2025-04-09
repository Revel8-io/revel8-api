import { PinataSDK } from "pinata-web3";
import Env from '@ioc:Adonis/Core/Env'
import axios from "axios";
import { uploadIterator } from "App/Controllers/Http/IpfsController";
import fs from 'fs/promises'

const PINATA_GATEWAY_TOKEN = Env.get('PINATA_GATEWAY_TOKEN')

export const pinata = new PinataSDK({
  pinataJwt: Env.get('PINATA_JWT'),
  pinataGateway: PINATA_GATEWAY_TOKEN
});

const pinataImageFetch = axios.create({
  baseURL: 'https://blush-legal-emu-115.mypinata.cloud/ipfs/',
  timeout: 20000,
  headers: {
    'authorization': `Bearer ${Env.get('PINATA_JWT')}`
  },
  params: {
    pinataGatewayToken: PINATA_GATEWAY_TOKEN
  }
})

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
  uploadIterator().iterate()
  const { default: Database } = await import('@ioc:Adonis/Lucid/Database')

  try {
    const rows = await Database
    .from('Atom')
    .select('Atom.*', 'AtomIpfsData.*', 'Atom.id as atomTableId')
    .fullOuterJoin('AtomIpfsData', 'Atom.id', 'AtomIpfsData.atomId')
    .where((query) => {
      query
        .where('Atom.data', 'like', 'ipfs://%')
        .orWhere('Atom.data', 'like', 'Qm%')
        .orWhere('Atom.data', 'like', 'bafk%')
    })
    .whereNull('AtomIpfsData.contents')
    .where(query => {
      query
        .whereNull('AtomIpfsData.contents')
        .orWhere('AtomIpfsData.contents', '{}')
    })
    .where(query => {
      query.where('AtomIpfsData.contentsAttempts', '<', 5)
      .orWhereNull('AtomIpfsData.contentsAttempts')
    })
    .orderBy('Atom.id', 'asc')

    if (rows.length > 0) {
      console.log('[CONTENTS] pending IPFS upload indexing rows.length', rows.length)
    }

    const fetchIPFSContent = async (row: any) => {
      let hash = ''
      hash = row.data.split('/').pop()
      console.log('[CONTENTS] hash', hash)

      const { data } = await axios.get(`https://blush-legal-emu-115.mypinata.cloud/ipfs/${hash}`, {
        params: {
          pinataGatewayToken: PINATA_GATEWAY_TOKEN
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
        console.error('[CONTENTS] Error getting data from Atom.id', row.atomTableId, err.message)
        isError = true
        if (err.response?.status === 429) {
          console.log('[CONTENTS] Rate limit exceeded, sleeping for 10 seconds')
          return await sleep(30000)
        }
      }

      const existingContentsRowForAtom = await Database.query()
        .from('AtomIpfsData')
        .where('atomId', row.atomTableId)

      let contents = data
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
        contents = { /* filename: data.name, */ ...moreContent }
      }
      try {
        if (existingContentsRowForAtom.length > 0) {
          await Database.query()
            .from('AtomIpfsData')
            .where('atomId', row.atomTableId)
            .update({ contents, contentsAttempts: isError ? existingContentsRowForAtom[0].contentsAttempts + 1 : 1 });
        } else {
          await Database
            .insertQuery()
            .table('AtomIpfsData')
            .insert({ atomId: row.atomTableId, contents });
        }
      } catch (err) {
        console.error('[CONTENTS] Error inserting or updating AtomIpfsData', err, row, existingContentsRowForAtom)
      }
    }

    const concurrentLimit = 5;
    const queue = rows.slice();
    const activePromises = new Set();

    const processNext = async () => {
      console.log('[CONTENTS] processing next')
      const row = queue.shift()!;
      if (!row) return
      const promise = processRow(row)
        .catch(err => console.log('[CONTENTS] failed to process row', row.atomTableId, err.message))
        .finally(() => {
          activePromises.delete(promise);
          if (queue.length > 0) {
            processNext();
          }
        });

      activePromises.add(promise);
    };

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

  // now need to read files from directory and see which are missing from AtomIpfsData.image_hash
  try {
    const rows = await Database.from('AtomIpfsData')
      .whereNull('imageFilename')
      .andWhereNot('contents', '{}')
      .andWhere('imageAttempts', '<', 5)
      .orderBy('atomId', 'asc')

    if (rows.length) {
      console.log('rows', rows.length)
      console.log('[IMAGES] images needing downloading', rows.length)
    }
    const files = await fs.readdir('public/img/atoms')
    console.log('1[IMAGES] image files.length', files.length)
    console.log('2 files', files.length)

    const processRow = async (row: any) => {
      const { contents } = row
      const imageUrl = contents.image
      if (!imageUrl || imageUrl === 'null') {
        await Database.from('AtomIpfsData').where('atomId', row.atomId)
          .update({ imageAttempts: 5 })
        return
      }
      // fetch the image and then save it to the public/img/atoms directory

      try {
        let data
        let response
        if (imageUrl.includes('_normal.')) {
          const imageUrlToFetch = imageUrl.replace('_normal.', '_400x400.')
          try {
            response = await axios.get(imageUrlToFetch, {
              responseType: 'arraybuffer'
            })
          } catch (err) {
            response = await axios.get(imageUrl, {
              responseType: 'arraybuffer'
            })
          } finally {
            data = response.data
          }
        } else {
          if (imageUrl.includes('ipfs://')) {
            response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
          } else if (imageUrl.startsWith('Qm') || imageUrl.startsWith('bafk')) {
            response = await pinataImageFetch.get(imageUrl, {
              responseType: 'arraybuffer'
            })
          } else if (new URL(imageUrl)) {
            response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
          }
          data = response.data
        }
        const extension = getImageExtension(data)
        const filename = `${row.atomId}.${extension}`
        await fs.writeFile(`public/img/atoms/${filename}`, data)
        await Database.from('AtomIpfsData').where('atomId', row.atomId)
          .update({ imageFilename: filename })
      } catch (err) {
        console.error('[IMAGES] Error downloading atom image', row.atomId, err.message)
        await Database.from('AtomIpfsData').where('atomId', row.atomId)
          .update({ imageAttempts: row.imageAttempts + 1 })
      }
    }

    // New concurrent processing implementation
    const concurrentLimit = 5;
    const queue = rows.slice();
    const activePromises = new Set();

    const processNext = async () => {
      // if (queue.length === 0) {
        //   console.log('queue is empty, waiting 500ms')
        //   setTimeout(populateIPFSContent, 500)
        //   return;
        // }

      const row = queue.shift()!;
      if (!row) return
      console.log('[IMAGES] processing next', row.atomId)
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

function getImageType(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'gif';
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'bmp';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'webp';
  return 'unknown';
}

const getImageExtension = (arrayBuffer) => {
  const imageType = getImageType(arrayBuffer)
  switch (imageType) {
    case 'jpeg':
      return 'jpg'
    case 'png':
      return 'png'
    case 'gif':
      return 'gif'
  }
}
