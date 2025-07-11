const ItinerarioSeleccionado = require('../models/ItinerarioSeleccionado');
const Estacion = require('../models/Estacion');
const ItinerarioSeleccionadoEstacion = require('../models/ItinerarioSeleccionadoEstacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const express = require('express');
const router = express.Router();
const { ssp } = require('../db/database');

const logLocation = 'itinerariosSeleccionados.js: ';
// Función auxiliar para manejar las estaciones del itinerario
async function manejarEstacionesItinerario(itinerarioId, estaciones) {
    // Eliminar todas las relaciones existentes
    await ItinerarioSeleccionadoEstacion.destroy({
        where: { itinerarioSeleccionadoId: itinerarioId }
    });

    // Crear las nuevas relaciones
    const estacionesData = estaciones.map(estacion => ({
        itinerarioSeleccionadoId: itinerarioId,
        estacionId: estacion.estacionId,
        orden: estacion.orden,
        horaProgramadaLlegada: estacion.horaProgramadaLlegada,
        horaProgramadaSalida: estacion.horaProgramadaSalida,
        observaciones: estacion.observaciones
    }));

    await ItinerarioSeleccionadoEstacion.bulkCreate(estacionesData);
}

// Obtener todos los itinerarios
router.get('/', async (req, res) => {
    try {
        const itinerarios = await ItinerarioSeleccionado.findAll({
            order: [['fecha', 'DESC']]
        });
        res.json(itinerarios);
    } catch (error) {
        logger.error('Error al obtener itinerarios seleccionados:', error);
        res.status(500).json({ mensaje: 'Error al obtener itinerarios seleccionados' });
    }
});

// Obtener todos los itinerarios seleccionados con paginación
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

        const result = await ssp.Simple(req.query, 'ItinerariosSeleccionados', columns);
        res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener itinerarios paginados:', error);
        res.status(500).json({ mensaje: 'Error al obtener itinerarios' });
    }
});

// Obtener un itinerario seleccionado por ID
router.get('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const itinerario = await ItinerarioSeleccionado.findByPk(id, {
            include: [{
                model: Estacion,
                as: 'estaciones',
                through: {
                    attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 
                                'horaRealLlegada', 'horaRealSalida', 'observaciones']
                },
                order: [[ItinerarioSeleccionadoEstacion, 'orden', 'ASC']]
            }]
        });

        if (!itinerario) {
            return res.status(404).json({ error: 'Itinerario seleccionado no encontrado' });
        }

        res.json(itinerario);
    } catch (error) {
        logger.error('Error al obtener itinerario seleccionado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar un itinerario seleccionado
router.delete('/:id',verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Primero eliminar las relaciones ItinerarioEstacion
        await ItinerarioSeleccionadoEstacion.destroy({ 
            where: { itinerarioSeleccionadoId: id } 
        });

        const itinerario = await ItinerarioSeleccionado.findByPk(id);

        if (!itinerario) {
            return res.status(404).json({ error: 'Itinerario seleccionado no encontrado' });
        }

        await itinerario.destroy();
        res.json({ message: 'Itinerario seleccionado eliminado correctamente' });
    } catch (error) {
        logger.error('Error al eliminar itinerario seleccionado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// recibe en el post una lista de id de itinerarios para ser usados en el dia incicado en post
router.post('/select', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { itinerarioIds, fecha } = req.body;
        
        // Validar que se proporcionen los datos necesarios
        if (!itinerarioIds || !Array.isArray(itinerarioIds) || itinerarioIds.length === 0) {
            return res.status(400).json({ 
                error: 'Se requiere una lista válida de IDs de itinerarios' 
            });
        }
        
        if (!fecha) {
            return res.status(400).json({ 
                error: 'Se requiere una fecha para los itinerarios seleccionados' 
            });
        }
        
        // Obtener los itinerarios originales con sus estaciones
        const Itinerario = require('../models/Itinerario');
        const itinerarios = await Itinerario.findAll({
            where: { id: itinerarioIds },
            include: [{
                model: Estacion,
                as: 'estaciones',
                through: {
                    attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 
                                'horaRealLlegada', 'horaRealSalida', 'observaciones']
                }
            }]
        });
        
        if (itinerarios.length !== itinerarioIds.length) {
            return res.status(404).json({ 
                error: 'Algunos itinerarios no fueron encontrados' 
            });
        }
        
        const itinerariosSeleccionadosCreados = [];
        
        // Crear los itinerarios seleccionados
        for (const itinerario of itinerarios) {
            // Crear el itinerario seleccionado
            const itinerarioSeleccionado = await ItinerarioSeleccionado.create({
                numero: itinerario.numero,
                origen: itinerario.origen,
                destino: itinerario.destino,
                fecha: fecha, // Usar la fecha proporcionada
                tipo: itinerario.tipo,
                material: itinerario.material,
                observaciones: itinerario.observaciones,
                estado: 'PENDIENTE'
            });
            
            // Copiar las estaciones del itinerario original
            if (itinerario.estaciones && itinerario.estaciones.length > 0) {
                const estacionesData = itinerario.estaciones.map(estacion => ({
                    itinerarioSeleccionadoId: itinerarioSeleccionado.id,
                    estacionId: estacion.id,
                    orden: estacion.ItinerarioEstacion.orden,
                    horaProgramadaLlegada: estacion.ItinerarioEstacion.horaProgramadaLlegada,
                    horaProgramadaSalida: estacion.ItinerarioEstacion.horaProgramadaSalida,
                    horaRealLlegada: estacion.ItinerarioEstacion.horaRealLlegada,
                    horaRealSalida: estacion.ItinerarioEstacion.horaRealSalida,
                    observaciones: estacion.ItinerarioEstacion.observaciones
                }));
                
                await ItinerarioSeleccionadoEstacion.bulkCreate(estacionesData);
            }
            
            itinerariosSeleccionadosCreados.push(itinerarioSeleccionado);
        }
        
        logger.info(logLocation + `Se crearon ${itinerariosSeleccionadosCreados.length} itinerarios seleccionados para la fecha ${fecha}`);
        
        res.status(201).json({
            mensaje: `Se crearon ${itinerariosSeleccionadosCreados.length} itinerarios seleccionados`,
            itinerarios: itinerariosSeleccionadosCreados
        });
        
    } catch (error) {
        logger.error(logLocation + 'Error al crear itinerarios seleccionados:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor al crear itinerarios seleccionados' 
        });
    }
});

module.exports = router; 