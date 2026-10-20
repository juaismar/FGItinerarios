const Circulacion = require('../models/Circulacion');
const Estacion = require('../models/Estacion');
const CirculacionEstacion = require('../models/CirculacionEstacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const express = require('express');
const router = express.Router();
const { ssp, sequelize } = require('../db/database');
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

// Cancelar una circulación sin borrar sus paradas
router.post('/:id/cancelar', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const circulacion = await Circulacion.findByPk(req.params.id);
        if (!circulacion) {
            return res.status(404).json({ mensaje: 'La circulación no fue encontrada.' });
        }

        if (circulacion.estado !== 'CANCELADO') {
            await circulacion.update({ estado: 'CANCELADO' });
        }

        res.json({ mensaje: 'Circulación cancelada', estado: circulacion.estado });
    } catch (error) {
        logger.error(logLocation + 'Error al cancelar la circulación:', error);
        res.status(500).json({ mensaje: 'Error al cancelar la circulación' });
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

const MARGEN_RETRASO_MINUTOS = 2;
const MARGEN_SIN_MARCA_MINUTOS = 1;
const ZONA_HORARIA = 'Europe/Madrid';

function diaEnMadrid(fecha) {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA_HORARIA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date(fecha));
    const valor = {};
    partes.forEach(parte => {
        if (parte.type !== 'literal') {
            valor[parte.type] = parte.value;
        }
    });
    return valor.year + '-' + valor.month + '-' + valor.day;
}

function fechaMadrid(fecha) {
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    return diaEnMadrid(new Date());
}

function formatearHora(hora) {
    if (!hora) {
        return '';
    }
    return String(hora).slice(0, 5);
}

function minutosDelDia(hora) {
    const texto = formatearHora(hora);
    const partes = texto.split(':');
    if (partes.length < 2) {
        return null;
    }
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
        return null;
    }
    return horas * 60 + minutos;
}

function textoRetraso(minutos) {
    if (minutos < 60) {
        return 'Retraso ' + minutos + ' min';
    }
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (resto === 0) {
        return 'Retraso ' + horas + ' h';
    }
    return 'Retraso ' + horas + ' h ' + resto + ' min';
}

function instanteProgramado(fechaCirculacion, hora) {
    const dia = diaEnMadrid(fechaCirculacion);
    const [anio, mes, diaMes] = dia.split('-').map(Number);
    const [horas, minutos] = formatearHora(hora).split(':').map(Number);
    if (!anio || Number.isNaN(horas) || Number.isNaN(minutos)) {
        return null;
    }

    const utc = new Date(Date.UTC(anio, mes - 1, diaMes, horas, minutos, 0));
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA_HORARIA,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).formatToParts(utc);
    const valor = {};
    partes.forEach(parte => {
        if (parte.type !== 'literal') {
            valor[parte.type] = parte.value;
        }
    });
    const visto = Date.UTC(
        Number(valor.year),
        Number(valor.month) - 1,
        Number(valor.day),
        Number(valor.hour) % 24,
        Number(valor.minute),
        Number(valor.second)
    );
    return new Date(utc.getTime() - (visto - utc.getTime()));
}

function describirSituacion(estado, programada, real, fechaCirculacion) {
    if (estado === 'CANCELADO') {
        return { texto: 'Cancelado', retraso: false, cancelado: true };
    }

    const minutosProgramados = minutosDelDia(programada);
    const minutosReales = minutosDelDia(real);
    if (minutosProgramados != null && minutosReales != null) {
        let diferencia = minutosReales - minutosProgramados;
        if (diferencia > 12 * 60) {
            diferencia -= 24 * 60;
        } else if (diferencia < -12 * 60) {
            diferencia += 24 * 60;
        }
        if (diferencia > MARGEN_RETRASO_MINUTOS) {
            return { texto: textoRetraso(diferencia), retraso: true, cancelado: false };
        }
        return { texto: '', retraso: false, cancelado: false };
    }

    const instante = instanteProgramado(fechaCirculacion, programada);
    if (!instante) {
        return { texto: '', retraso: false, cancelado: false };
    }

    const minutosSinMarca = Math.floor((Date.now() - instante.getTime()) / 60000);
    if (minutosSinMarca >= MARGEN_SIN_MARCA_MINUTOS) {
        return { texto: textoRetraso(minutosSinMarca), retraso: true, cancelado: false };
    }

    return { texto: '', retraso: false, cancelado: false };
}

function paradasOrdenadas(circulacion) {
    return (circulacion.estaciones || [])
        .map(estacion => ({ estacion, parada: estacion.CirculacionEstacion }))
        .filter(item => item.parada)
        .sort((a, b) => a.parada.orden - b.parada.orden);
}

function filaVisor(circulacion, parada, hora, columnas) {
    const situacion = describirSituacion(circulacion.estado, hora, columnas.horaReal, circulacion.fecha);
    const observacion = situacion.texto || parada.observaciones || circulacion.observaciones || '';

    return {
        hora: formatearHora(hora),
        tren: circulacion.material || circulacion.tipo || '',
        numero: circulacion.numero,
        via: parada.via || '',
        observaciones: observacion,
        retraso: situacion.retraso,
        cancelado: situacion.cancelado,
        ...columnas.destino
    };
}

// Obtener datos del visor para una estación específica
router.get('/visor/:estacionCodigo', async (req, res) => {
    try {
        const { estacionCodigo } = req.params;
        const fecha = fechaMadrid(req.query.fecha);

        const estacion = await Estacion.findOne({
            where: { codigo: estacionCodigo }
        });

        if (!estacion) {
            return res.status(404).json({ error: 'Estación no encontrada' });
        }

        const circulaciones = await Circulacion.findAll({
            where: sequelize.where(
                sequelize.literal(`("Circulacion"."fecha" AT TIME ZONE 'Europe/Madrid')::date`),
                fecha
            ),
            include: [{
                model: Estacion,
                as: 'estaciones',
                through: {
                    attributes: [
                        'orden',
                        'horaProgramadaLlegada',
                        'horaProgramadaSalida',
                        'horaRealLlegada',
                        'horaRealSalida',
                        'via',
                        'observaciones'
                    ]
                }
            }],
            order: [['numero', 'ASC']]
        });

        const salidas = [];
        const llegadas = [];

        circulaciones.forEach(circulacion => {
            const paradas = paradasOrdenadas(circulacion);
            const indice = paradas.findIndex(item => item.estacion.codigo === estacionCodigo);
            if (indice < 0) {
                return;
            }

            const { parada } = paradas[indice];
            const esPrimera = indice === 0;
            const esUltima = indice === paradas.length - 1;

            if ((esPrimera || !esUltima) && parada.horaProgramadaSalida) {
                const destino = esPrimera
                    ? circulacion.destino
                    : paradas[indice + 1].estacion.nombre;
                salidas.push(filaVisor(circulacion, parada, parada.horaProgramadaSalida, {
                    horaReal: parada.horaRealSalida,
                    destino: { destino }
                }));
            }

            if ((esUltima || !esPrimera) && parada.horaProgramadaLlegada) {
                const procedencia = esUltima
                    ? circulacion.origen
                    : paradas[indice - 1].estacion.nombre;
                llegadas.push(filaVisor(circulacion, parada, parada.horaProgramadaLlegada, {
                    horaReal: parada.horaRealLlegada,
                    destino: { procedencia }
                }));
            }
        });

        salidas.sort((a, b) => a.hora.localeCompare(b.hora) || String(a.numero).localeCompare(String(b.numero)));
        llegadas.sort((a, b) => a.hora.localeCompare(b.hora) || String(a.numero).localeCompare(String(b.numero)));

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