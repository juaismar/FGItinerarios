require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../logger').logger;
const { SSP } = require('js_ssp');

const SSPconfig = { // TODO Inicializar
  dialect: 'postgres',
  host: 'localhost',
  user: 'postgres',
  password: 'postgres',
  database: 'fgitinerarios',
  port: 5432 
};
let ssp = new SSP(SSPconfig);

const config = {
  development: {
    username: 'postgres',
    password: 'postgres',
    database: 'fgitinerarios',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: 'postgres1',
    password: 'postgres',
    database: 'fgitinerarios_test',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
};

const env = process.env.FGItinerarios_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging
  }
);

// Función para inicializar la conexión
async function inicializarConexion() {
  try {

    // Probar la conexión
    await sequelize.authenticate();
    logger.info('Conexión a la base de datos establecida correctamente');

    // Importar modelos
    require('../models/Usuario');
    require('../models/Itinerario');
    require('../models/ItinerarioSeleccionado');

    // Sincronizar modelos
    await sequelize.sync({ alter: env === 'development' });
    logger.info('Modelos sincronizados correctamente');

    return sequelize;
  } catch (error) {
    logger.error('Error al inicializar la conexión:', error);
    throw error;
  }
}

// Función para ejecutar el seed en desarrollo
async function ejecutarSeed() {
  if (env === 'development') {
    try {
      const seed = require('./seed');
      await seed();
      logger.info('Seed ejecutado correctamente');
    } catch (error) {
      logger.error('Error al ejecutar seed: ' + error);
    }
  }
}

// Función para cerrar la conexión
async function cerrarConexion() {
  try {
    await sequelize.close();
    logger.info('Conexión cerrada correctamente');
  } catch (error) {
    logger.error('Error al cerrar la conexión:', error);
    throw error;
  }
}

module.exports = {
  ssp,
  sequelize,
  inicializarConexion,
  ejecutarSeed,
  cerrarConexion
}; 