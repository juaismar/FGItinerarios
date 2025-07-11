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
        
        // Buscar en ItinerarioEstacion por itinerarioId y obtener datos de estaciones
        const itinerarioSeleccionadoEstaciones = await ItinerarioSeleccionadoEstacion.findAll({
            where: { itinerarioSeleccionadoId: id },
            order: [['orden', 'ASC']]
        });
        
        if (itinerarioSeleccionadoEstaciones.length === 0) {
            return res.json([]);
        }
        
        // Obtener los IDs de las estaciones
        const estacionIds = itinerarioSeleccionadoEstaciones.map(ie => ie.estacionId);
        
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
        const estacionesFormateadas = itinerarioSeleccionadoEstaciones.map(ie => {
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
router.post('/', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { estaciones, ...itinerarioData } = req.body;
        
        // Crear el itinerario
        const itinerario = await ItinerarioSeleccionado.create(itinerarioData);
        
        // Manejar las estaciones del itinerario
        await manejarEstacionesItinerario(itinerario.id, estaciones);
        
        res.status(201).json(itinerario);
        
    } catch (error) {
        logger.error(logLocation + 'Error al crear itinerario custom:', error);
        res.status(500).json({ mensaje: 'Error al crear itinerario custom' });
    }
});

// Actualizar itinerario
router.put('/:id', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { estaciones, ...itinerarioData } = req.body;
        
        // Actualizar datos del itinerario
        await ItinerarioSeleccionado.update(itinerarioData, { where: { id } });
        
        // Manejar las estaciones del itinerario
        await manejarEstacionesItinerario(id, estaciones);
        
        res.status(204).send();
    } catch (error) {
        logger.error('Error al actualizar itinerario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar itinerario' });
    }
});

// Obtener malla de circulaciones entre estaciones
router.get('/mallacirculaciones', async (req, res) => {
    try {
        const { fecha } = req.query;
        
        // Si no se proporciona fecha, usar hoy
        let fechaConsulta;
        if (fecha) {
            fechaConsulta = new Date(fecha);
            if (isNaN(fechaConsulta.getTime())) {
                return res.status(400).json({ error: 'Formato de fecha inválido' });
            }
        } else {
            fechaConsulta = new Date();
        }

        const inicioDia = new Date(fechaConsulta.getFullYear(), fechaConsulta.getMonth(), fechaConsulta.getDate(), 0, 0, 0);
        const finDia = new Date(fechaConsulta.getFullYear(), fechaConsulta.getMonth(), fechaConsulta.getDate(), 23, 59, 59, 999);

        // Obtener todos los itinerarios seleccionados para la fecha
        const itinerarios = await ItinerarioSeleccionado.findAll({
            where: {
                fecha: {
                    [Op.gte]: inicioDia,
                    [Op.lte]: finDia
                }
            },
            include: [{
                model: Estacion,
                as: 'estaciones',
                through: {
                    attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida']
                },
                order: [[ItinerarioSeleccionadoEstacion, 'orden', 'ASC']]
            }],
            order: [['fecha', 'ASC']]
        });

        // Procesar los datos para crear la malla
        const malla = {
            fecha: fechaConsulta.toISOString().split('T')[0],
            estaciones: [],
            circulaciones: []
        };

        // Obtener todas las estaciones únicas
        const estacionesUnicas = new Set();
        const estacionesMap = new Map();

        itinerarios.forEach(itinerario => {
            if (itinerario.estaciones) {
                itinerario.estaciones.forEach(estacion => {
                    estacionesUnicas.add(estacion.id);
                    if (!estacionesMap.has(estacion.id)) {
                        estacionesMap.set(estacion.id, {
                            id: estacion.id,
                            nombre: estacion.nombre,
                            codigo: estacion.codigo
                        });
                    }
                });
            }
        });

        malla.estaciones = Array.from(estacionesMap.values());

        // Crear las circulaciones
        itinerarios.forEach(itinerario => {
            if (itinerario.estaciones && itinerario.estaciones.length > 1) {
                // Crear conexiones entre estaciones consecutivas
                for (let i = 0; i < itinerario.estaciones.length - 1; i++) {
                    const estacionActual = itinerario.estaciones[i];
                    const estacionSiguiente = itinerario.estaciones[i + 1];
                    
                    const circulacion = {
                        itinerarioId: itinerario.id,
                        numero: itinerario.numero,
                        origen: itinerario.origen,
                        destino: itinerario.destino,
                        tipo: itinerario.tipo,
                        estado: itinerario.estado,
                        desde: {
                            estacionId: estacionActual.id,
                            estacionNombre: estacionActual.nombre,
                            estacionCodigo: estacionActual.codigo,
                            horaSalida: estacionActual.ItinerarioSeleccionadoEstacion.horaProgramadaSalida
                        },
                        hasta: {
                            estacionId: estacionSiguiente.id,
                            estacionNombre: estacionSiguiente.nombre,
                            estacionCodigo: estacionSiguiente.codigo,
                            horaLlegada: estacionSiguiente.ItinerarioSeleccionadoEstacion.horaProgramadaLlegada
                        }
                    };
                    
                    malla.circulaciones.push(circulacion);
                }
            }
        });

        res.json(malla);
    } catch (error) {
        logger.error('Error al obtener malla de circulaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener datos del visor para una estación específica
router.get('/visor/:estacionCodigo', async (req, res) => {
    try {
        const { estacionCodigo } = req.params;
        const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
        
        // Buscar la estación por código
        const estacion = await Estacion.findOne({
            where: { codigo: estacionCodigo }
        });
        
        if (!estacion) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }
        
        // Obtener todos los itinerarios seleccionados para la fecha
        const itinerarios = await ItinerarioSeleccionado.findAll({
            where: {
                fecha: {
                    [Op.between]: [
                        `${fecha} 00:00:00`,
                        `${fecha} 23:59:59`
                    ]
                }
            },
            include: [{
                model: Estacion,
                as: 'estaciones',
                through: {
                    attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 'observaciones']
                },
                order: [[ItinerarioSeleccionadoEstacion, 'orden', 'ASC']]
            }],
            order: [['fecha', 'ASC']]
        });
        
        // Procesar los itinerarios para obtener salidas y llegadas
        const salidas = [];
        const llegadas = [];
        
        itinerarios.forEach(itinerario => {
            // Buscar la estación específica en el itinerario
            const estacionEnItinerario = itinerario.estaciones.find(e => e.codigo === estacionCodigo);
            
            if (estacionEnItinerario) {
                const horaItinerario = new Date(itinerario.fecha);
                const horaFormateada = horaItinerario.toTimeString().slice(0, 5);
                
                // Determinar si es salida o llegada basado en el orden
                const esPrimeraEstacion = estacionEnItinerario.orden === 1;
                const esUltimaEstacion = estacionEnItinerario.orden === itinerario.estaciones.length;
                
                // Si es la primera estación, es una salida
                if (esPrimeraEstacion) {
                    salidas.push({
                        hora: horaFormateada,
                        destino: itinerario.destino,
                        tren: itinerario.material || itinerario.tipo,
                        numero: itinerario.numero,
                        via: '1', // Por defecto
                        observaciones: estacionEnItinerario.observaciones || ''
                    });
                }
                
                // Si es la última estación, es una llegada
                if (esUltimaEstacion) {
                    llegadas.push({
                        hora: horaFormateada,
                        procedencia: itinerario.origen,
                        tren: itinerario.material || itinerario.tipo,
                        numero: itinerario.numero,
                        via: '1', // Por defecto
                        observaciones: estacionEnItinerario.observaciones || ''
                    });
                }
                
                // Si no es ni la primera ni la última, puede ser tanto salida como llegada
                if (!esPrimeraEstacion && !esUltimaEstacion) {
                    // Buscar la estación anterior y siguiente
                    const estacionAnterior = itinerario.estaciones.find(e => e.orden === estacionEnItinerario.orden - 1);
                    const estacionSiguiente = itinerario.estaciones.find(e => e.orden === estacionEnItinerario.orden + 1);
                    
                    // Si hay estación anterior, es una llegada
                    if (estacionAnterior) {
                        llegadas.push({
                            hora: estacionEnItinerario.horaProgramadaLlegada || horaFormateada,
                            procedencia: estacionAnterior.nombre,
                            tren: itinerario.material || itinerario.tipo,
                            numero: itinerario.numero,
                            via: '1',
                            observaciones: estacionEnItinerario.observaciones || ''
                        });
                    }
                    
                    // Si hay estación siguiente, es una salida
                    if (estacionSiguiente) {
                        salidas.push({
                            hora: estacionEnItinerario.horaProgramadaSalida || horaFormateada,
                            destino: estacionSiguiente.nombre,
                            tren: itinerario.material || itinerario.tipo,
                            numero: itinerario.numero,
                            via: '1',
                            observaciones: estacionEnItinerario.observaciones || ''
                        });
                    }
                }
            }
        });
        
        // Ordenar por hora
        salidas.sort((a, b) => a.hora.localeCompare(b.hora));
        llegadas.sort((a, b) => a.hora.localeCompare(b.hora));
        
        res.json({
            salidas,
            llegadas,
            estacion: {
                nombre: estacion.nombre,
                codigo: estacion.codigo
            }
        });
        
    } catch (error) {
        logger.error('Error al obtener datos del visor:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router; 