import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { pinata } from '../../../providers/routines'

export default class IpfsController {
  public async index({}: HttpContextContract) {}

  public async create({request, response }: HttpContextContract) {
    try {
      console.log('request.only', request.body())
      const { note, xUsername, xID } = request.body()
      const noteKeys = {
        'X.com User': {
          filenameKey: 'x_user',
          pinataGroup: '1f38f345-0c45-4e2f-b875-2a1634d5f2bb' // testnet
        }
      }
      const unixTimestamp = Math.floor(Date.now() / 1000)
      const filename = `${noteKeys[note].filenameKey || '_'}-${xID}-${xUsername}-${unixTimestamp}`

      const { IpfsHash, PinSize, Timestamp} = await pinata.upload.json({
        content: JSON.stringify(request.body()),
        name: filename,

      }).group(noteKeys[note].pinataGroup)

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
}
