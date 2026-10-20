const Circulacion = require('../models/Circulacion');
const Estacion = require('../models/Estacion');
const CirculacionEstacion = require('../models/CirculacionEstacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const express = require('express');
const router = express.Router();
const { ssp } = require('../db/database');
const { Op } = require('sequelize');

const logLocation = 'circulaciones.js: ';

// Función para copiar estaciones de un itinerario original a una circulación
async function copiarItinerario(itinerarioOriginalId, circulacionId) {
    try {
        // Obtener las estaciones del itinerario original
        const ItinerarioEstacion = require('../models/ItinerarioEstacion');
        const estacionesOriginales = await ItinerarioEstacion.findAll({
            where: { itinerarioId: itinerarioOriginalId },
            order: [['orden', 'ASC']]
        });
        
        //console.log(`Estaciones encontradas para itinerario ${itinerarioOriginalId}:`, estacionesOriginales.length);
        
        if (estacionesOriginales.length > 0) {
            // Crear las estaciones para la circulación
            const estacionesData = estacionesOriginales.map(estacion => ({
                circulacionId: circulacionId,
                estacionId: estacion.estacionId,
                orden: estacion.orden,
                horaProgramadaLlegada: estacion.horaProgramadaLlegada,
                horaProgramadaSalida: estacion.horaProgramadaSalida,
                horaRealLlegada: estacion.horaRealLlegada,
                horaRealSalida: estacion.horaRealSalida,
                observaciones: estacion.observaciones
            }));
            
            //console.log('Datos de estaciones a copiar:', estacionesData);
            
            // Crear las estaciones en la circulación
            await CirculacionEstacion.bulkCreate(estacionesData);
            
            logger.info(logLocation + `Estaciones copiadas del itinerario ${itinerarioOriginalId} al ${circulacionId}`);
        } else {
            console.log(`No se encontraron estaciones para el itinerario ${itinerarioOriginalId}`);
        }
    } catch (error) {
        logger.error(logLocation + `Error al copiar estaciones del itinerario ${itinerarioOriginalId}:`, error);
        throw error;
    }
}

// Función auxiliar para manejar las estaciones de la circulación
async function manejarEstacionesCirculacion(circulacionId, estaciones) {
    // Eliminar todas las relaciones existentes
    await CirculacionEstacion.destroy({
        where: { circulacionId: circulacionId }
    });

    // Crear las nuevas relaciones
    const estacionesData = estaciones.map(estacion => ({
        circulacionId: circulacionId,
        estacionId: estacion.estacionId,
        orden: estacion.orden,
        horaProgramadaLlegada: estacion.horaProgramadaLlegada,
        horaProgramadaSalida: estacion.horaProgramadaSalida,
        observaciones: estacion.observaciones
    }));

    await CirculacionEstacion.bulkCreate(estacionesData);
}

// Obtener todas las circulaciones con paginación
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

        const result = await ssp.Complex(req.query, 'Circulaciones', columns, whereResult, whereAll);
        res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener circulaciones paginadas:', error);
        res.status(500).json({ mensaje: 'Error al obtener circulaciones' });
    }
});

// Obtener una circulación por ID
router.get('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const circulacion = await Circulacion.findByPk(id, {
            include: [{
                model: Estacion,
                as: 'estaciones',
                through: {
                    attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 
                                'horaRealLlegada', 'horaRealSalida', 'observaciones']
                },
                order: [[CirculacionEstacion, 'orden', 'ASC']]
            }]
        });

        if (!circulacion) {
            return res.status(404).json({ error: 'Circulación no encontrada' });
        }

        res.json(circulacion);
    } catch (error) {
        logger.error('Error al obtener circulación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estaciones de una circulación
router.get('/:id/estaciones', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar las estaciones de la circulación
        const circulacionEstaciones = await CirculacionEstacion.findAll({
            where: { circulacionId: id },
            order: [['orden', 'ASC']]
        });
        
        if (circulacionEstaciones.length === 0) {
            return res.json([]);
        }
        
        // Obtener los IDs de las estaciones
        const estacionIds = circulacionEstaciones.map(ie => ie.estacionId);
        
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
        const estacionesFormateadas = circulacionEstaciones.map(ie => {
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
        logger.error('Error al obtener estaciones de la circulación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener circulaciones por fecha
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

        const circulaciones = await Circulacion.findAll({
            where: {
                fecha: {
                    [Op.gte]: inicioDia,
                    [Op.lte]: finDia
                }
            },
            attributes: ['numero'], // Solo necesitamos el número para comparar
            order: [['numero', 'ASC']]
        });

        res.json(circulaciones);
    } catch (error) {
        logger.error('Error al obtener circulaciones de hoy:', error);
        res.status(500).json({ mensaje: 'Error al obtener circulaciones de hoy' });
    }
});

// Eliminar una circulación
router.delete('/:id',verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // Primero eliminar las estaciones de la circulación
        await CirculacionEstacion.destroy({ 
            where: { circulacionId: id } 
        });

        const circulacion = await Circulacion.findByPk(id);

        if (!circulacion) {
            return res.status(404).json({ error: 'Circulación no encontrada' });
        }

        await circulacion.destroy();
        res.json({ message: 'Circulación eliminada correctamente' });
    } catch (error) {
        logger.error('Error al eliminar circulación:', error);
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
                error: 'Se requiere una fecha para las circulaciones' 
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
        
        const circulacionesCreadas = [];
        
        // Crear las circulaciones
        for (const itinerario of itinerarios) {
            // Crear el circulación
            const circulacion = await Circulacion.create({
                numero: itinerario.numero,
                origen: itinerario.origen,
                destino: itinerario.destino,
                fecha: (() => {
                    const fechaObj = new Date(fecha);
                    
                    // Parsear la cadena de tiempo (formato: "HH:MM:SS")
                    const tiempoParts = itinerario.fecha.split(':');
                    const hora = parseInt(tiempoParts[0], 10);
                    const minuto = parseInt(tiempoParts[1], 10);
                    const segundo = parseInt(tiempoParts[2], 10);
                    
                    // Validar que la fecha sea válida
                    if (isNaN(fechaObj.getTime())) {
                        console.log('Fecha inválida, usando fecha original');
                        return fechaObj;
                    }
                    
                    // Validar que los componentes de tiempo sean válidos
                    if (isNaN(hora) || isNaN(minuto) || isNaN(segundo)) {
                        console.log('Tiempo inválido, usando fecha original');
                        return fechaObj;
                    }
                    
                    const fechaCombinada = new Date(
                        fechaObj.getFullYear(),
                        fechaObj.getMonth(),
                        fechaObj.getDate(),
                        hora,
                        minuto,
                        segundo
                    );
                    
                    return fechaCombinada;
                })(),
                tipo: itinerario.tipo,
                material: itinerario.material,
                observaciones: itinerario.observaciones,
                estado: 'PENDIENTE'
            });
            
            circulacionesCreadas.push(circulacion);

            // Copiar las estaciones del itinerario original
            await copiarItinerario(itinerario.id, circulacion.id);
        }
        
        logger.info(logLocation + `Se crearon ${circulacionesCreadas.length} circulaciones para la fecha ${fecha}`);
        
        res.status(201).json({
            mensaje: `Se crearon ${circulacionesCreadas.length} circulaciones`,
            circulaciones: circulacionesCreadas
        });
        
    } catch (error) {
        logger.error(logLocation + 'Error al crear circulaciones:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor al crear circulaciones' 
        });
    }
});

// Crear circulación
router.post('/', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { estaciones, ...circulacionData } = req.body;
        
        const circulacion = await Circulacion.create(circulacionData);
        
        await manejarEstacionesCirculacion(circulacion.id, estaciones);
        
        res.status(201).json(circulacion);
        
    } catch (error) {
        logger.error(logLocation + 'Error al crear circulación:', error);
        res.status(500).json({ mensaje: 'Error al crear la circulación' });
    }
});

// Actualizar circulación
router.put('/:id', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { estaciones, ...circulacionData } = req.body;
        
        await Circulacion.update(circulacionData, { where: { id } });
        
        await manejarEstacionesCirculacion(id, estaciones);
        
        res.status(204).send();
    } catch (error) {
        logger.error('Error al actualizar circulación:', error);
        res.status(500).json({ mensaje: 'Error al actualizar la circulación' });
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

        // Obtener todas las circulaciones para la fecha
        const circulaciones = await Circulacion.findAll({
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
                order: [[CirculacionEstacion, 'orden', 'ASC']]
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

        circulaciones.forEach(circulacion => {
            if (circulacion.estaciones) {
                circulacion.estaciones.forEach(estacion => {
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
        circulaciones.forEach(circulacion => {
            if (circulacion.estaciones && circulacion.estaciones.length > 1) {
                // Crear conexiones entre estaciones consecutivas
                for (let i = 0; i < circulacion.estaciones.length - 1; i++) {
                    const estacionActual = circulacion.estaciones[i];
                    const estacionSiguiente = circulacion.estaciones[i + 1];
                    
                    const tramo = {
                        circulacionId: circulacion.id,
                        numero: circulacion.numero,
                        origen: circulacion.origen,
                        destino: circulacion.destino,
                        tipo: circulacion.tipo,
                        estado: circulacion.estado,
                        desde: {
                            estacionId: estacionActual.id,
                            estacionNombre: estacionActual.nombre,
                            estacionCodigo: estacionActual.codigo,
                            horaSalida: estacionActual.CirculacionEstacion.horaProgramadaSalida
                        },
                        hasta: {
                            estacionId: estacionSiguiente.id,
                            estacionNombre: estacionSiguiente.nombre,
                            estacionCodigo: estacionSiguiente.codigo,
                            horaLlegada: estacionSiguiente.CirculacionEstacion.horaProgramadaLlegada
                        }
                    };
                    
                    malla.circulaciones.push(tramo);
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
        
        // Obtener todas las circulaciones para la fecha
        const circulaciones = await Circulacion.findAll({
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
                order: [[CirculacionEstacion, 'orden', 'ASC']]
            }],
            order: [['fecha', 'ASC']]
        });
        
        // Procesar las circulaciones para obtener salidas y llegadas
        const salidas = [];
        const llegadas = [];
        
        circulaciones.forEach(circulacion => {
            // Buscar la estación específica en la circulación
            const estacionEnCirculacion = circulacion.estaciones.find(e => e.codigo === estacionCodigo);
            
            if (estacionEnCirculacion) {
                const horaCirculacion = new Date(circulacion.fecha);
                const horaFormateada = horaCirculacion.toTimeString().slice(0, 5);
                
                // Determinar si es salida o llegada basado en el orden
                const esPrimeraEstacion = estacionEnCirculacion.orden === 1;
                const esUltimaEstacion = estacionEnCirculacion.orden === circulacion.estaciones.length;
                
                // Si es la primera estación, es una salida
                if (esPrimeraEstacion) {
                    salidas.push({
                        hora: horaFormateada,
                        destino: circulacion.destino,
                        tren: circulacion.material || circulacion.tipo,
                        numero: circulacion.numero,
                        via: '1', // Por defecto
                        observaciones: estacionEnCirculacion.observaciones || ''
                    });
                }
                
                // Si es la última estación, es una llegada
                if (esUltimaEstacion) {
                    llegadas.push({
                        hora: horaFormateada,
                        procedencia: circulacion.origen,
                        tren: circulacion.material || circulacion.tipo,
                        numero: circulacion.numero,
                        via: '1', // Por defecto
                        observaciones: estacionEnCirculacion.observaciones || ''
                    });
                }
                
                // Si no es ni la primera ni la última, puede ser tanto salida como llegada
                if (!esPrimeraEstacion && !esUltimaEstacion) {
                    // Buscar la estación anterior y siguiente
                    const estacionAnterior = circulacion.estaciones.find(e => e.orden === estacionEnCirculacion.orden - 1);
                    const estacionSiguiente = circulacion.estaciones.find(e => e.orden === estacionEnCirculacion.orden + 1);
                    
                    // Si hay estación anterior, es una llegada
                    if (estacionAnterior) {
                        llegadas.push({
                            hora: estacionEnCirculacion.horaProgramadaLlegada || horaFormateada,
                            procedencia: estacionAnterior.nombre,
                            tren: circulacion.material || circulacion.tipo,
                            numero: circulacion.numero,
                            via: '1',
                            observaciones: estacionEnCirculacion.observaciones || ''
                        });
                    }
                    
                    // Si hay estación siguiente, es una salida
                    if (estacionSiguiente) {
                        salidas.push({
                            hora: estacionEnCirculacion.horaProgramadaSalida || horaFormateada,
                            destino: estacionSiguiente.nombre,
                            tren: circulacion.material || circulacion.tipo,
                            numero: circulacion.numero,
                            via: '1',
                            observaciones: estacionEnCirculacion.observaciones || ''
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