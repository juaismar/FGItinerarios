require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { inicializarConexion, ejecutarSeed, cerrarConexion, getSequelize } = require('./db/database');
const logger = require('./logger').logger;

// Determinar el entorno
const entorno = process.env.FGItinerarios_ENV || 'development';
logger.info(`Iniciando aplicación en entorno: ${entorno}`);

const app = express();
const logLocation = 'server.js: ';

// Configuración de CORS
const corsOptions = {
  origin: entorno === 'production' 
    ? process.env.CORS_ORIGIN 
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Rutas API
const apiRouter = require('./router');

// Definir rutas API antes de las rutas del cliente
app.use('/', apiRouter);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  logger.error(logLocation + 'Error en la aplicación: ' + err.stack);
  
  res.status(500).json({ 
    mensaje: 'Algo salió mal!',
    error: err.message,
    stack: err.stack
  });
});

const PORT = process.env.PORT || 3000;

// Función para iniciar el servidor
async function iniciarServidor() {
  try {
    // Inicializar conexión a la base de datos
    await inicializarConexion();
    
    // Ejecutar seed en desarrollo
    await ejecutarSeed();
    
    // Iniciar el servidor
    const server = app.listen(PORT, () => {
      logger.info(logLocation + `Servidor corriendo en puerto ${PORT} (${entorno})`);
    });

    // Manejar el cierre del servidor
    server.on('close', async () => {
      try {
        await cerrarConexion();
        logger.info(logLocation + 'Servidor y conexiones cerradas correctamente');
      } catch (error) {
        logger.error(logLocation + 'Error al cerrar conexiones: ' + error);
      }
    });

    // Manejar señales de terminación
    process.on('SIGINT', () => {
      logger.info(logLocation + 'Cerrando servidor...');
      server.close(() => {
        logger.info(logLocation + 'Servidor cerrado');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      logger.info(logLocation + 'Cerrando servidor...');
      server.close(() => {
        logger.info(logLocation + 'Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error(logLocation + 'Error al iniciar el servidor: ' + error);
    process.exit(1);
  }
}

// Iniciar el servidor
iniciarServidor();
