const express = require('express');
const router = express.Router();
const Estacion = require('../models/Estacion');
const logger = require('../logger').logger;

const logLocation = 'estaciones.js: ';

// Obtener todas las estaciones
router.get('/', async (req, res) => {
    try {
        const estaciones = await Estacion.findAll({
            order: [['nombre', 'ASC']]
        });
        
        logger.info(logLocation + 'Estaciones obtenidas exitosamente');
        res.json(estaciones);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener estaciones: ' + error);
        res.status(500).json({ mensaje: 'Error al obtener estaciones' });
    }
});

module.exports = router; 