const express = require('express');
const router = express.Router();
const logger = require('./logger').logger;
const path = require('path');

const logLocation = 'router.js: ';

// Control de peticiones
router.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    logger.info(`${logLocation}Accediendo a: ${req.method} ${req.originalUrl}`);
    
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
const usuariosRoutes = require('./controllers/usuarios');
const estacionesRoutes = require('./controllers/estaciones');

// Servir archivos estáticos desde la carpeta public
router.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
router.use('/api/itinerarios', itinerariosRoutes);
router.use('/api/usuarios', usuariosRoutes);
router.use('/api/estaciones', estacionesRoutes);

// Ruta para servir el index.html
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = router;
