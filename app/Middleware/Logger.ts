import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'

export default class LoggerMiddleware {
  public async handle(
    { request }: HttpContextContract,
    next: () => Promise<void>
  ) {
    const startTime = process.hrtime()

    // Log the incoming request
    Logger.info(`[REQUEST] ${request.method()} ${request.url()} | IP: ${request.ip()}`)

    // Continue with the request
    await next()

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime)
    const responseTime = (seconds * 1000 + nanoseconds / 1000000).toFixed(2)

    // Log after the request is completed
    Logger.info(`[RESPONSE] ${request.method()} ${request.url()} | Time: ${responseTime}ms`)
  }
}
