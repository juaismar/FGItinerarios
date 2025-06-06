const express = require('express');
const router = express.Router();
const Itinerario = require('../models/Itinerario');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const { Op } = require('sequelize');
const paginate = require('sequelize-paginate');
const { ssp } = require('../db/database');

// Configurar paginación para el modelo Itinerario
paginate.paginate(Itinerario);

const logLocation = 'itinerarios.js: ';

// Obtener todos los itinerarios
router.get('/', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const itinerarios = await Itinerario.findAll({
            order: [['fecha', 'DESC']]
        });
        res.json(itinerarios);
    } catch (error) {
        logger.error('Error al obtener itinerarios:', error);
        res.status(500).json({ mensaje: 'Error al obtener itinerarios' });
    }
});

// Nueva ruta paginada para la página de administración
router.get('/paginated', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const columns = [
            { db: 'id', dt: 'id', formatter: null },
            { db: 'numero', dt: 'numero', formatter: null },
            { db: 'origen', dt: 'origen', formatter: null },
            { db: 'destino', dt: 'destino', formatter: null },
            { db: 'fecha', dt: 'fecha', formatter: (value) => new Date(value).toLocaleString('es-ES') },
            { db: 'estado', dt: 'estado', formatter: null },
            { db: 'tipo', dt: 'tipo', formatter: null },
            { db: 'material', dt: 'material', formatter: null }
        ];

        const result = await ssp.Simple(req.query, 'Itinerarios', columns);
        res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener itinerarios paginados:', error);
        res.status(500).json({ mensaje: 'Error al obtener itinerarios' });
    }
});

// Crear nuevo itinerario (solo planificador o admin)
router.post('/', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const itinerario = await Itinerario.create(req.body);
        res.status(201).json(itinerario);
    } catch (error) {
        logger.error('Error al crear itinerario:', error);
        res.status(500).json({ mensaje: 'Error al crear itinerario' });
    }
});

// Actualizar itinerario (solo planificador o admin)
router.put('/:id', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await Itinerario.update(req.body, { where: { id } });
        res.status(204).send();
    } catch (error) {
        logger.error('Error al actualizar itinerario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar itinerario' });
    }
});

// Eliminar itinerario (solo admin)
router.delete('/:id', verificarAuth('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await Itinerario.destroy({ where: { id } });
        res.status(204).send();
    } catch (error) {
        logger.error('Error al eliminar itinerario:', error);
        res.status(500).json({ mensaje: 'Error al eliminar itinerario' });
    }
});

module.exports = router; 