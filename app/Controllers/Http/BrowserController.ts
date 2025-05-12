import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import puppeteer from 'puppeteer'

export default class BrowserController {
  public async getWebpageInfo({ request, response }: HttpContextContract) {
    const { url } = request.qs()
    console.log('[getPageMeta] executing')

    const browser = await puppeteer.launch()
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
    const { url } = request.params()

    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(url)

    const screenshot = await page.screenshot({ encoding: 'binary' })

    await browser.close()

    return response.json({ screenshot })
  }
}
