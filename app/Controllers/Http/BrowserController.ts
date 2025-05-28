import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import { CONFIG } from '../../../common/constants/web3'

export default class BrowserController {
  public async getWebpageInfo({ request, response }: HttpContextContract) {
    const { url } = request.qs()
    console.log('[getPageMeta] executing')

    const browser = await puppeteer.launch()
    puppeteer.use(StealthPlugin())
    console.log('[getPageMeta] browser', browser)

    const page = await browser.newPage()
    console.log('[getPageMeta] page', page)

    await page.goto(url)
    const title = await page.title()
    console.log('[getPageMeta] title', title)

    // Extract meta description using page.evaluate()
    const description = await page.evaluate(() => {
      const metaDescription = document.querySelector('meta[name="description"]')
      return metaDescription ? metaDescription.getAttribute('content') : null
    })
    console.log('[getPageMeta] description', description)

    await browser.close()

    return response.json({ title, description })
  }

  public async getWebpageScreenshot({ request, response }: HttpContextContract) {
    const { url } = request.qs()

    const browser = await puppeteer.launch()
    console.log('[getWebpageScreenshot] browser launched')
    const page = await browser.newPage()
    console.log('[getWebpageScreenshot] page created')
    await page.goto(url)
    console.log('[getWebpageScreenshot] page loaded')
    const FILE_TYPE = 'jpeg'
    const screenshotParams = {
      encoding: 'binary',
      type: FILE_TYPE as 'jpeg' | 'png' | 'webp',
      quality: FILE_TYPE === 'jpeg' ? 80 : null,
    }
    const screenshot = await page.screenshot(screenshotParams)
    console.log('[getWebpageScreenshot] screenshot taken')
    const formattedUrl = url.replace('https://', '').replace('http://', '').replace('/', '_').replace('.', '-')
    const imageName = `${formattedUrl}.${FILE_TYPE}`
    const imagePath = `public/img/url/${imageName}`
    const relativeImagePath = `img/url/${imageName}`
    const imageUrl = `${CONFIG.REVEL8_API_ORIGIN}/${relativeImagePath}`
    fs.writeFileSync(imagePath, screenshot)
    console.log('[getWebpageScreenshot] screenshot saved')

    response.json({ screenshot, url: imageUrl })
    await browser.close()
    return
  }
}
