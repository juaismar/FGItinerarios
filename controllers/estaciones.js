const express = require('express');
const router = express.Router();
const Estacion = require('../models/Estacion');
const logger = require('../logger').logger;
const auth = require('../middleware/auth');

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

// Crear una nueva estación (solo admin)
router.post('/', auth.verificarToken, auth.verificarRol('admin'), async (req, res) => {
    try {
        const { nombre, codigo, ubicacion, activa } = req.body;
        const estacion = await Estacion.create({ nombre, codigo, ubicacion, activa });
        logger.info(logLocation + 'Estación creada exitosamente');
        res.status(201).json(estacion);
    } catch (error) {
        logger.error(logLocation + 'Error al crear la estación: ' + error);
        res.status(500).json({ mensaje: 'Error al crear la estación' });
    }
});

// Eliminar estación (solo admin)
router.delete('/:id', auth.verificarToken, auth.verificarRol('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await Estacion.destroy({ where: { id } });
        logger.info(logLocation + 'Estación eliminada exitosamente');
        res.status(204).send();
    } catch (error) {
        logger.error(logLocation + 'Error al eliminar la estación: ' + error);
        res.status(500).json({ mensaje: 'Error al eliminar la estación' });
    }
});

// Actualizar estación (solo admin)
router.put('/:id', auth.verificarToken, auth.verificarRol('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, codigo, ubicacion, activa } = req.body;
        await Estacion.update({ nombre, codigo, ubicacion, activa }, { where: { id } });
        logger.info(logLocation + 'Estación actualizada exitosamente');
        res.status(204).send();
    } catch (error) {
        logger.error(logLocation + 'Error al actualizar la estación: ' + error);
        res.status(500).json({ mensaje: 'Error al actualizar la estación' });
    }
});

module.exports = router; 