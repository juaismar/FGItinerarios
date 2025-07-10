const ItinerarioSeleccionado = require('../models/ItinerarioSeleccionado');
const Estacion = require('../models/Estacion');
const ItinerarioEstacion = require('../models/ItinerarioEstacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const express = require('express');
const router = express.Router();

const logLocation = 'itinerariosSeleccionados.js: ';
// Función auxiliar para manejar las estaciones del itinerario
async function manejarEstacionesItinerario(itinerarioId, estaciones) {
    // Eliminar todas las relaciones existentes
    await ItinerarioEstacion.destroy({
        where: { itinerarioId: itinerarioId }
    });

    // Crear las nuevas relaciones
    const estacionesData = estaciones.map(estacion => ({
        itinerarioId: itinerarioId,
        estacionId: estacion.estacionId,
        orden: estacion.orden,
        horaProgramadaLlegada: estacion.horaProgramadaLlegada,
        horaProgramadaSalida: estacion.horaProgramadaSalida,
        observaciones: estacion.observaciones
    }));

    await ItinerarioEstacion.bulkCreate(estacionesData);
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
                order: [[ItinerarioEstacion, 'orden', 'ASC']]
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
        await ItinerarioEstacion.destroy({ 
            where: { itinerarioId: id } 
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


module.exports = router; 