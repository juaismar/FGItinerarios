const express = require('express');
const router = express.Router();
const Itinerario = require('../models/Itinerario');
const { auth, esPlanificador } = require('../middleware/auth');
const logger = require('../logger').logger;

const logLocation = 'itinerarios.js: ';

// Obtener todos los itinerarios
router.get('/', auth, async (req, res) => {
  try {
    const itinerarios = await Itinerario.findAll({
      include: [{
        model: require('../models/Usuario'),
        attributes: ['nombre', 'email']
      }]
    });
    logger.info(logLocation + 'Itinerarios obtenidos exitosamente');
    res.json(itinerarios);
  } catch (error) {
    logger.error(logLocation + 'Error al obtener itinerarios: ' + error);
    res.status(500).json({ mensaje: 'Error al obtener itinerarios' });
  }
});

// Crear nuevo itinerario (solo planificadores)
router.post('/', auth, esPlanificador, async (req, res) => {
  try {
    const itinerario = await Itinerario.create({
      ...req.body,
    });
    logger.info(logLocation + 'Nuevo itinerario creado: ' + itinerario.numero);
    res.status(201).json(itinerario);
  } catch (error) {
    logger.error(logLocation + 'Error al crear itinerario: ' + error);
    res.status(400).json({ mensaje: 'Error al crear itinerario' });
  }
});

// Actualizar itinerario (solo planificadores)
router.patch('/:id', auth, esPlanificador, async (req, res) => {
  try {
    const itinerario = await Itinerario.findByPk(req.params.id);
    if (!itinerario) {
      logger.warn(logLocation + 'Itinerario no encontrado: ' + req.params.id);
      return res.status(404).json({ mensaje: 'Itinerario no encontrado' });
    }
    await itinerario.update(req.body);
    logger.info(logLocation + 'Itinerario actualizado: ' + itinerario.numero);
    res.json(itinerario);
  } catch (error) {
    logger.error(logLocation + 'Error al actualizar itinerario: ' + error);
    res.status(400).json({ mensaje: 'Error al actualizar itinerario' });
  }
});

// Eliminar itinerario (solo planificadores)
router.delete('/:id', auth, esPlanificador, async (req, res) => {
  try {
    const itinerario = await Itinerario.findByPk(req.params.id);
    if (!itinerario) {
      logger.warn(logLocation + 'Itinerario no encontrado: ' + req.params.id);
      return res.status(404).json({ mensaje: 'Itinerario no encontrado' });
    }
    await itinerario.destroy();
    logger.info(logLocation + 'Itinerario eliminado: ' + req.params.id);
    res.json({ mensaje: 'Itinerario eliminado' });
  } catch (error) {
    logger.error(logLocation + 'Error al eliminar itinerario: ' + error);
    res.status(500).json({ mensaje: 'Error al eliminar itinerario' });
  }
});

module.exports = router; 