const ItinerarioSeleccionado = require('../models/ItinerarioSeleccionado');
const Estacion = require('../models/Estacion');
const ItinerarioSeleccionadoEstacion = require('../models/ItinerarioSeleccionadoEstacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const express = require('express');
const router = express.Router();
const { ssp } = require('../db/database');
const { Op } = require('sequelize');

const logLocation = 'itinerariosSeleccionados.js: ';

// Función para copiar estaciones de un itinerario original a uno seleccionado
async function copiarItinerario(itinerarioOriginalId, itinerarioSeleccionadoId) {
    try {
        // Obtener las estaciones del itinerario original
        const ItinerarioEstacion = require('../models/ItinerarioEstacion');
        const estacionesOriginales = await ItinerarioEstacion.findAll({
            where: { itinerarioId: itinerarioOriginalId },
            order: [['orden', 'ASC']]
        });
        
        console.log(`Estaciones encontradas para itinerario ${itinerarioOriginalId}:`, estacionesOriginales.length);
        
        if (estacionesOriginales.length > 0) {
            // Crear las estaciones para el itinerario seleccionado
            const estacionesData = estacionesOriginales.map(estacion => ({
                itinerarioSeleccionadoId: itinerarioSeleccionadoId,
                estacionId: estacion.estacionId,
                orden: estacion.orden,
                horaProgramadaLlegada: estacion.horaProgramadaLlegada,
                horaProgramadaSalida: estacion.horaProgramadaSalida,
                horaRealLlegada: estacion.horaRealLlegada,
                horaRealSalida: estacion.horaRealSalida,
                observaciones: estacion.observaciones
            }));
            
            console.log('Datos de estaciones a copiar:', estacionesData);
            
            // Crear las estaciones en el itinerario seleccionado
            await ItinerarioSeleccionadoEstacion.bulkCreate(estacionesData);
            
            logger.info(logLocation + `Estaciones copiadas del itinerario ${itinerarioOriginalId} al ${itinerarioSeleccionadoId}`);
        } else {
            console.log(`No se encontraron estaciones para el itinerario ${itinerarioOriginalId}`);
        }
    } catch (error) {
        logger.error(logLocation + `Error al copiar estaciones del itinerario ${itinerarioOriginalId}:`, error);
        throw error;
    }
}

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

// Obtener todos los itinerarios seleccionados con paginación
router.get('/paginated', async (req, res) => {
    try {
        const columns = [
            { db: 'id', dt: 'id', formatter: null },
            { db: 'numero', dt: 'numero', formatter: null },
            { db: 'origen', dt: 'origen', formatter: null },
            { db: 'destino', dt: 'destino', formatter: null },
            { db: 'fecha', dt: 'fecha', formatter: (value) => value },
            { db: 'estado', dt: 'estado', formatter: null },
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

        const result = await ssp.Complex(req.query, 'ItinerarioSeleccionados', columns, whereResult, whereAll);
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

// Obtener estaciones de un itinerario seleccionado
router.get('/:id/estaciones', async (req, res) => {
    try {
        const { id } = req.params;
        
        const estaciones = await ItinerarioSeleccionadoEstacion.findAll({
            where: { itinerarioSeleccionadoId: id },
            include: [{
                model: Estacion,
                attributes: ['nombre', 'codigo']
            }],
            order: [['orden', 'ASC']]
        });

        const estacionesFormateadas = estaciones.map(estacion => ({
            orden: estacion.orden,
            nombre: estacion.Estacion.nombre,
            codigo: estacion.Estacion.codigo,
            horaProgramadaLlegada: estacion.horaProgramadaLlegada,
            horaProgramadaSalida: estacion.horaProgramadaSalida,
            observaciones: estacion.observaciones
        }));

        res.json(estacionesFormateadas);
    } catch (error) {
        logger.error('Error al obtener estaciones del itinerario seleccionado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener itinerarios seleccionados por fecha
router.get('/', async (req, res) => {
    try {
        const date = req.query.date;
        
        // Si no se proporciona fecha, usar hoy
        let fechaConsulta;
        if (date) {
            fechaConsulta = new Date(date);
            if (isNaN(fechaConsulta.getTime())) {
                return res.status(400).json({ error: 'Formato de fecha inválido' });
            }
        } else {
            fechaConsulta = new Date();
        }

        const inicioDia = new Date(fechaConsulta.getFullYear(), fechaConsulta.getMonth(), fechaConsulta.getDate(), 0, 0, 0);
        const finDia = new Date(fechaConsulta.getFullYear(), fechaConsulta.getMonth(), fechaConsulta.getDate(), 23, 59, 59, 999);

        const itinerarios = await ItinerarioSeleccionado.findAll({
            where: {
                fecha: {
                    [Op.gte]: inicioDia,
                    [Op.lte]: finDia
                }
            },
            attributes: ['numero'], // Solo necesitamos el número para comparar
            order: [['numero', 'ASC']]
        });

        res.json(itinerarios);
    } catch (error) {
        logger.error('Error al obtener itinerarios seleccionados de hoy:', error);
        res.status(500).json({ mensaje: 'Error al obtener itinerarios seleccionados de hoy' });
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
            
            
            /*// Copiar las estaciones del itinerario original
                console.log(itinerario)
                console.log(itinerario.estaciones)
            if (itinerario.estaciones && itinerario.estaciones.length > 0) {
                console.log(itinerario.estaciones.ItinerarioEstacion)
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
            }*/
            
            itinerariosSeleccionadosCreados.push(itinerarioSeleccionado);

            // Copiar las estaciones del itinerario original
            await copiarItinerario(itinerario.id, itinerarioSeleccionado.id);
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

// Crear itinerario custom
router.post('/custom', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { numero, origen, destino, tipo, material, observaciones, fecha, estado } = req.body;
        
        // Validar campos requeridos
        if (!numero || !origen || !destino || !tipo || !fecha) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: número, origen, destino, tipo y fecha' 
            });
        }
        
        // Validar que el número de tren no esté duplicado para la misma fecha
        const itinerarioExistente = await ItinerarioSeleccionado.findOne({
            where: {
                numero: numero,
                fecha: {
                    [Op.between]: [
                        new Date(fecha.split('T')[0] + 'T00:00:00'),
                        new Date(fecha.split('T')[0] + 'T23:59:59')
                    ]
                }
            }
        });
        
        if (itinerarioExistente) {
            return res.status(409).json({ 
                error: `Ya existe un tren con el número ${numero} para la fecha seleccionada` 
            });
        }
        
        // Crear el itinerario custom
        const itinerarioCustom = await ItinerarioSeleccionado.create({
            numero: numero,
            origen: origen,
            destino: destino,
            fecha: fecha,
            tipo: tipo,
            material: material,
            observaciones: observaciones,
            estado: estado || 'PENDIENTE'
        });
        
        logger.info(logLocation + `Itinerario custom creado: ${numero} (${origen} - ${destino}) para ${fecha}`);
        
        res.status(201).json({
            mensaje: 'Itinerario custom creado exitosamente',
            itinerario: itinerarioCustom
        });
        
    } catch (error) {
        logger.error(logLocation + 'Error al crear itinerario custom:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor al crear itinerario custom' 
        });
    }
});

module.exports = router; 