const express = require('express');
const router = express.Router();
const Itinerario = require('../models/Itinerario');
const { verificarToken, verificarRol, esPlanificador } = require('../middleware/auth');
const logger = require('../logger').logger;
const { Op } = require('sequelize');
const paginate = require('sequelize-paginate');

// Configurar paginación para el modelo Itinerario
paginate.paginate(Itinerario);

const logLocation = 'itinerarios.js: ';

// Obtener todos los itinerarios
router.get('/', verificarToken, async (req, res) => {
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
router.get('/paginated', verificarToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const estado = req.query.estado || '';
    const fechaInicio = req.query.fechaInicio || '';
    const fechaFin = req.query.fechaFin || '';

    // Construir condiciones de búsqueda
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${search}%` } },
        { origen: { [Op.iLike]: `%${search}%` } },
        { destino: { [Op.iLike]: `%${search}%` } },
        { tipo: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (estado) {
      where.estado = estado;
    }

    if (fechaInicio && fechaFin) {
      where.fecha = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    } else if (fechaInicio) {
      where.fecha = {
        [Op.gte]: new Date(fechaInicio)
      };
    } else if (fechaFin) {
      where.fecha = {
        [Op.lte]: new Date(fechaFin)
      };
    }

    // Usar sequelize-paginate para obtener los resultados paginados
    const { docs, pages, total } = await Itinerario.paginate({
      page,
      paginate: limit,
      where,
      include: [{
        model: require('../models/Usuario'),
        attributes: ['nombre', 'email']
      }],
      order: [['fecha', 'DESC']]
    });

    logger.info(logLocation + 'Itinerarios paginados obtenidos exitosamente');
    res.json({
      data: docs,
      pagination: {
        total,
        page,
        limit,
        totalPages: pages
      }
    });
  } catch (error) {
    logger.error(logLocation + 'Error al obtener itinerarios paginados: ' + error);
    res.status(500).json({ mensaje: 'Error al obtener itinerarios paginados' });
  }
});

// Crear nuevo itinerario (solo planificador o admin)
router.post('/', verificarToken, esPlanificador, async (req, res) => {
    try {
        const itinerario = await Itinerario.create(req.body);
        res.status(201).json(itinerario);
    } catch (error) {
        logger.error('Error al crear itinerario:', error);
        res.status(500).json({ mensaje: 'Error al crear itinerario' });
    }
});

// Actualizar itinerario (solo planificador o admin)
router.put('/:id', verificarToken, esPlanificador, async (req, res) => {
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
router.delete('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
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