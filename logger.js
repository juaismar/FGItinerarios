const winston = require('winston')
//const LokiTransport = require('winston-loki')

const logger = winston.createLogger()

logger.add(new winston.transports.Console({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.simple()
  ),
  handleExceptions: true
}))

  /*logger.add(new LokiTransport({
    level: 'info',
    host: process.env.LOKI_URL + '/loki/api/v1/push',
    json: true,
    batchInterval: 0,
    gracefulShutdown: true, 
    basicAuth: process.env.LOKI_USER + ':' + process.env.LOKI_PASS,
    labels: { job: 'gretel_printer', env: process.env.GRETEL_ENV }
  }))*/

  /* save on file
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error', handleExceptions: true }))
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }))
  */

/* Levels
logger.silly('silly')
logger.debug('debug')
logger.verbose('verbose')
logger.info('info')
logger.warn('warn')
logger.error('error')
*/
exports.logger = logger
