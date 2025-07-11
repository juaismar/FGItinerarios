const express = require('express');
const router = express.Router();
const Itinerario = require('../models/Itinerario');
const ItinerarioEstacion = require('../models/ItinerarioEstacion');
const Estacion = require('../models/Estacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const { ssp } = require('../db/database');


const logLocation = 'itinerarios.js: ';

// Función para manejar las estaciones de un itinerario
async function manejarEstacionesItinerario(itinerarioId, estaciones) {
    if (!estaciones || !Array.isArray(estaciones)) {
        return;
    }
    
    // Eliminar todas las relaciones existentes
    await ItinerarioEstacion.destroy({ 
        where: { itinerarioId: itinerarioId } 
    });
    
    // Crear las nuevas relaciones
    const estacionesData = estaciones.map(estacion => ({
        itinerarioId: parseInt(itinerarioId),
        estacionId: estacion.estacionId,
        orden: estacion.orden,
        horaProgramadaLlegada: estacion.horaProgramadaLlegada,
        horaProgramadaSalida: estacion.horaProgramadaSalida,
        horaRealLlegada: estacion.horaRealLlegada,
        horaRealSalida: estacion.horaRealSalida,
        observaciones: estacion.observaciones
    }));
    
    await ItinerarioEstacion.bulkCreate(estacionesData);
    
    logger.info(logLocation + `Estaciones del itinerario ${itinerarioId} actualizadas: ${estaciones.length} estaciones`);
}

// Obtener todos los itinerarios
router.get('/', async (req, res) => {
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

router.get('/paginated', async (req, res) => {
    try {
        const columns = [
            { db: 'id', dt: 'id', formatter: null },
            { db: 'numero', dt: 'numero', formatter: null },
            { db: 'origen', dt: 'origen', formatter: null },
            { db: 'destino', dt: 'destino', formatter: null },
            { db: 'fecha', dt: 'fecha', formatter: (value) => value },
            { db: 'tipo', dt: 'tipo', formatter: null },
            { db: 'material', dt: 'material', formatter: null }
        ];

        let whereResult = [];
        let whereAll = [];

        //buscar el parametro fecha
        const fechaStart = req.query.cs_DateStart;
        if (fechaStart) {
           whereResult.push(`fecha >= '${fechaStart}'`);
        }
        const fechaEnd = req.query.cs_DateEnd;
        if (fechaEnd) {
            whereResult.push(`fecha < '${fechaEnd}'`);
         }
        

        const result = await ssp.Complex(req.query, 'Itinerarios', columns, whereResult, whereAll);
        res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener itinerarios paginados:', error);
        res.status(500).json({ mensaje: 'Error al obtener itinerarios' });
    }
});

// Crear nuevo itinerario
router.post('/', verificarAuth(['admin']), async (req, res) => {
    try {
        const { estaciones, ...itinerarioData } = req.body;
        
        // Crear el itinerario
        const itinerario = await Itinerario.create(itinerarioData);
        
        // Manejar las estaciones del itinerario
        await manejarEstacionesItinerario(itinerario.id, estaciones);
        
        res.status(201).json(itinerario);
    } catch (error) {
        logger.error('Error al crear itinerario:', error);
        res.status(500).json({ mensaje: 'Error al crear itinerario' });
    }
});

// Actualizar itinerario
router.put('/:id', verificarAuth(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { estaciones, ...itinerarioData } = req.body;
        
        // Actualizar datos del itinerario
        await Itinerario.update(itinerarioData, { where: { id } });
        
        // Manejar las estaciones del itinerario
        await manejarEstacionesItinerario(id, estaciones);
        
        res.status(204).send();
    } catch (error) {
        logger.error('Error al actualizar itinerario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar itinerario' });
    }
});

// Eliminar itinerario
router.delete('/:id', verificarAuth('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Primero eliminar las relaciones ItinerarioEstacion
        await ItinerarioEstacion.destroy({ 
            where: { itinerarioId: id } 
        });
        
        // Luego eliminar el itinerario
        await Itinerario.destroy({ where: { id } });
        
        logger.info(logLocation + `Itinerario ${id} eliminado junto con sus relaciones`);
        res.status(204).send();
    } catch (error) {
        logger.error('Error al eliminar itinerario:', error);
        res.status(500).json({ mensaje: 'Error al eliminar itinerario' });
    }
});

// Obtener estaciones de un itinerario específico
router.get('/:id/estaciones', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar en ItinerarioEstacion por itinerarioId y obtener datos de estaciones
        const itinerarioEstaciones = await ItinerarioEstacion.findAll({
            where: { itinerarioId: id },
            order: [['orden', 'ASC']]
        });
        
        if (itinerarioEstaciones.length === 0) {
            return res.json([]);
        }
        
        // Obtener los IDs de las estaciones
        const estacionIds = itinerarioEstaciones.map(ie => ie.estacionId);
        
        // Obtener las estaciones correspondientes
        const estaciones = await Estacion.findAll({
            where: { id: estacionIds },
            attributes: ['id', 'nombre', 'codigo']
        });
        
        // Crear un mapa para acceso rápido
        const estacionesMap = {};
        estaciones.forEach(estacion => {
            estacionesMap[estacion.id] = estacion;
        });
        
        // Formatear los datos para el frontend
        const estacionesFormateadas = itinerarioEstaciones.map(ie => {
            const estacion = estacionesMap[ie.estacionId];
            return {
                id: estacion.id,
                nombre: estacion.nombre,
                codigo: estacion.codigo,
                orden: ie.orden,
                horaProgramadaLlegada: ie.horaProgramadaLlegada,
                horaProgramadaSalida: ie.horaProgramadaSalida,
                horaRealLlegada: ie.horaRealLlegada,
                horaRealSalida: ie.horaRealSalida,
                observaciones: ie.observaciones
            };
        });

        res.json(estacionesFormateadas);
    } catch (error) {
        logger.error('Error al obtener estaciones del itinerario:', error);
        res.status(500).json({ mensaje: 'Error al obtener estaciones del itinerario' });
    }
});

module.exports = router; 