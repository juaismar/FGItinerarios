const express = require('express');
const fs = require('fs');
const router = express.Router();
const logger = require('./logger').logger;
const path = require('path');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const logLocation = 'router.js: ';

// Control de peticiones
router.use((req, res, next) => {
    logger.debug(`${logLocation}Accediendo a: ${req.method} ${req.originalUrl}`);
    
    // Capturar respuestas 404
    res.on('finish', () => {
        if (res.statusCode === 404) {
            logger.warn(`${logLocation}Ruta no encontrada: ${req.method} ${req.originalUrl}`);
        }
    });
    
    next();
});

// Importar controladores
const itinerariosRoutes = require('./controllers/itinerarios');
const circulacionesRoutes = require('./controllers/circulaciones');
const usuariosRoutes = require('./controllers/usuarios');
const estacionesRoutes = require('./controllers/estaciones');
const panel = require('./controllers/panel');
const controlEstacion = require('./controllers/controlEstacion');

// Servir archivos estáticos desde la carpeta public
router.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
router.use('/api/itinerarios', itinerariosRoutes);
router.use('/api/circulaciones', circulacionesRoutes);
router.use('/api/usuarios', usuariosRoutes);
router.use('/api/estaciones', estacionesRoutes);
router.use('/api/panel', panel);
router.use('/api/controlEstacion', controlEstacion);

const especificacionApi = yaml.load(
    fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8')
);
router.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(especificacionApi, {
    customSiteTitle: 'FG Itinerarios API',
    swaggerOptions: { persistAuthorization: true }
}));

// Ruta para servir el index.html
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = router;
