import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { pinata } from '../../../providers/routines'
import axios from 'axios'
import fs from 'fs'
import baseX from '@multiformats/base-x'
import { createHash } from 'crypto'

let i = 0
export const uploadIterator = () => {
  return {
    iterate: () => i++,
    get: () => i
  }
}

const PINATA_GROUPS = {
  'X.com User': {
    filenameKey: 'x_user',
    pinataGroup: '1f38f345-0c45-4e2f-b875-2a1634d5f2bb' // testnet
  },
  'Uploaded Image': {
    filenameKey: 'uploaded_image',
    pinataGroup: '1f38f345-0c45-4e2f-b875-2a1634d5f2bb' // testnet
  }
}

// Constants for CIDv1 construction
const RAW_CODEC = 0x55
const SHA2_256 = 0x12
const CIDv1 = 0x01

async function hashData(data: string): Promise<string> {
  // Create SHA-256 hash
  const hash = createHash('sha256').update(data).digest()

  // Construct the CID prefix
  const prefix = new Uint8Array([CIDv1, RAW_CODEC])

  // Construct the multihash (0x12 = sha2-256, 0x20 = 32 bytes length)
  const multihash = new Uint8Array([SHA2_256, 0x20, ...hash])

  // Combine prefix and multihash
  const cidBytes = new Uint8Array([...prefix, ...multihash])

  // Use base32 encoding (standard for CIDv1)
  const base32 = baseX('abcdefghijklmnopqrstuvwxyz234567')

  // Encode the complete CID
  return 'b' + base32.encode(cidBytes)
}

export default class IpfsController {
  public getIterator = ({response}) => response.json(i)
  public async index({}: HttpContextContract) {}

  public async create({request, response }: HttpContextContract) {
    try {
      console.log('request.only', request.body())
      const { note, xUsername, xID } = request.body()
      const unixTimestamp = Math.floor(Date.now() / 1000)
      const filename = `${PINATA_GROUPS[note].filenameKey || '_'}-${xUsername}-${xID}-${unixTimestamp}`

      const { IpfsHash, PinSize, Timestamp} = await pinata.upload.json({
        content: JSON.stringify(request.body()),
        name: filename,
      }).group(PINATA_GROUPS[note].pinataGroup)

      return response.status(200).json({
        cid: IpfsHash
      })
    } catch (err) {
      console.error('Error uploading content to IPFS', err)
      return response.status(500).json({
        error: 'Error uploading content to IPFS',
        message: err.message
      })
    }
  }

  public async store({}: HttpContextContract) {}

  public async show({}: HttpContextContract) {}

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}

  public async uploadImage({request, response}: HttpContextContract) {
    // take image file from request
    // get uploaded file using the 'image' name
    const image = request.file('image')
    console.log('image', image)
    if (!image || image.type !== 'image') {
      return response.status(400).json({
        error: 'No image file provided'
      })
    }
    const unixTimestamp = Math.floor(Date.now() / 1000)
    // get buffer from image temporary path file
    const imageBuffer = fs.readFileSync(image.tmpPath as string)

    console.log('imageBuffer', imageBuffer)
    // get the file extension
    const hash = await hashData(imageBuffer?.toString() || '')
    console.log('hash', hash)
    const fileExtension = image.extname
    const imageName = `${unixTimestamp}-${hash.substring(0, 10)}-${image.data.clientName.substring(0, 10)}.${fileExtension}`
    const imagePath = `public/img/uploads/${imageName}` as string
    fs.writeFileSync(imagePath, imageBuffer!)
    const file = new File([imageBuffer], imageName, { type: image.type })
    const { IpfsHash, PinSize, Timestamp} = await pinata.upload.file(
      file,
      { name: imageName, group: PINATA_GROUPS['Uploaded Image'].pinataGroup }
    )
    return response.status(200).json({
      ipfsHash: IpfsHash,
      pinSize: PinSize,
      timestamp: Timestamp
    })
  }
}
