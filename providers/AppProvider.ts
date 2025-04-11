import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { populateIPFSContent, populateImageFiles } from './routines'
import { getContractConfig } from './routines/multivault'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings
  }

  public async boot() {
    // IoC container is ready

  }

  public async ready() {
		await import('@ioc:Adonis/Lucid/Database')
		await import('@ioc:Adonis/Addons/Redis')
		await import('@ioc:Adonis/Core/Env')
    // testPinataAuth()
    populateIPFSContent()
    populateImageFiles()
    getContractConfig()
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
