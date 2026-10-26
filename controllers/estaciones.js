const express = require('express');
const router = express.Router();
const Estacion = require('../models/Estacion');
const logger = require('../logger').logger;
const { verificarAuth } = require('../middleware/auth');
const { ssp } = require('../db/database');

const logLocation = 'estaciones.js: ';

function esMarcada(valor) {
    return valor === true || valor === 'true' || valor === 't' || valor === 1 || valor === '1';
}

const GESTIONES = ['SIN_GESTION', 'MANUAL', 'AUTOMATICA'];

function marcasEstacion(activa, gestion) {
    const estaActiva = esMarcada(activa);
    const modo = GESTIONES.includes(gestion) ? gestion : 'SIN_GESTION';
    return {
        activa: estaActiva,
        gestion: estaActiva ? modo : 'SIN_GESTION'
    };
}

// Obtener estaciones paginadas
router.get('/paginated', verificarAuth('admin'), async (req, res) => {
    try {
        const columns = [
            { db: 'id', dt: 'id', formatter: null },
            { db: 'nombre', dt: 'nombre', formatter: null },
            { db: 'codigo', dt: 'codigo', formatter: null },
            { db: 'ubicacion', dt: 'ubicacion', formatter: null },
            { db: 'activa', dt: 'activa', formatter: null },
            { db: 'gestion', dt: 'gestion', formatter: null }
        ];

        const result = await ssp.Simple(req.query, 'Estacions', columns);
        res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener estaciones paginadas:', error);
        res.status(500).json({ mensaje: 'Error al obtener estaciones' });
    }
});

// Obtener todas las estaciones
router.get('/', verificarAuth(['admin', 'planificador']), async (req, res) => {
    try {
        const estaciones = await Estacion.findAll({
            order: [['nombre', 'ASC']]
        });
        
        res.json(estaciones);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener estaciones: ' + error);
        res.status(500).json({ mensaje: 'Error al obtener estaciones' });
    }
});

// Crear una nueva estación (solo admin)
router.post('/', verificarAuth('admin'), async (req, res) => {
    try {
        const { nombre, codigo, ubicacion, activa, gestion } = req.body;
        const marcas = marcasEstacion(activa, gestion);
        const estacion = await Estacion.create({ nombre, codigo, ubicacion, ...marcas });
        logger.info(logLocation + 'Estación creada exitosamente');
        res.status(201).json(estacion);
    } catch (error) {
        logger.error(logLocation + 'Error al crear la estación: ' + error);
        res.status(500).json({ mensaje: 'Error al crear la estación' });
    }
});

// Eliminar estación (solo admin)
router.delete('/:id', verificarAuth('admin'), async (req, res) => {
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
router.put('/:id', verificarAuth('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, codigo, ubicacion, activa, gestion } = req.body;
        const marcas = marcasEstacion(activa, gestion);
        await Estacion.update({ nombre, codigo, ubicacion, ...marcas }, { where: { id } });
        logger.info(logLocation + 'Estación actualizada exitosamente');
        res.status(204).send();
    } catch (error) {
        logger.error(logLocation + 'Error al actualizar la estación: ' + error);
        res.status(500).json({ mensaje: 'Error al actualizar la estación' });
    }
});

module.exports = router; 