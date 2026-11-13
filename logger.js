require('dotenv').config();
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const enProduccion = process.env.FGItinerarios_ENV === 'production';

function nivelDeLog() {
  if (enProduccion) {
    return 'info';
  }
  return 'debug';
}

const nivel = nivelDeLog();

function directorioPedido() {
  if (process.env.LOG_DIR) return process.env.LOG_DIR;
  if (enProduccion && process.platform !== 'win32') return '/var/log/fgitinerarios';
  return path.join(__dirname, 'logs');
}

function prepararDirectorio(preferido) {
  try {
    fs.mkdirSync(preferido, { recursive: true });
    return preferido;
  } catch (error) {
    const respaldo = path.join(__dirname, 'logs');
    fs.mkdirSync(respaldo, { recursive: true });
    console.error(`No se pudo crear ${preferido} (${error.message}). Los logs se guardan en ${respaldo}`);
    return respaldo;
  }
}

const directorio = prepararDirectorio(directorioPedido());

function marcaDeTiempo() {
  const fecha = new Date();
  const dos = (n, ancho = 2) => String(n).padStart(ancho, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} `
    + `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}.${dos(fecha.getMilliseconds(), 3)}`;
}

// Winston ya copia la pila al registro, pero el transporte no: hay que dejarla en el mensaje.
function incorporarDetalle(info) {
  if (info.stack && !String(info.message).includes(info.stack)) {
    info.message = `${info.message}\n${info.stack}`;
  }
  return info;
}

const formatoBase = winston.format.combine(
  winston.format.timestamp({ format: marcaDeTiempo }),
  winston.format.errors({ stack: true }),
  winston.format(incorporarDetalle)(),
  winston.format.splat()
);

const formatoLinea = winston.format.printf(
  (info) => `${info.timestamp} ${info.level} ${info.message}`
);

const formatoConsola = winston.format.combine(
  ...(process.stdout.isTTY ? [winston.format.colorize()] : []),
  formatoLinea
);

const transporteAplicacion = new DailyRotateFile({
  dirname: directorio,
  filename: 'fgitinerarios-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '30d',
  level: nivel,
  format: formatoLinea
});

// Sin maxFiles: file-stream-rotator no borra los ficheros de error.
const transporteErrores = new DailyRotateFile({
  dirname: directorio,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  format: formatoLinea,
  handleExceptions: true,
  handleRejections: true
});

const transporteConsola = new winston.transports.Console({
  level: nivel,
  format: formatoConsola,
  handleExceptions: true,
  handleRejections: true
});

const logger = winston.createLogger({
  level: nivel,
  format: formatoBase,
  transports: [transporteAplicacion, transporteErrores, transporteConsola],
  exceptionHandlers: [transporteErrores, transporteConsola],
  rejectionHandlers: [transporteErrores, transporteConsola]
});

logger.info(`Logs en ${directorio} (nivel ${nivel})`);

exports.logger = logger;
