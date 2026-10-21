const Estacion = require('../models/Estacion');
const Itinerario = require('../models/Itinerario');
const ItinerarioEstacion = require('../models/ItinerarioEstacion');
const Circulacion = require('../models/Circulacion');
const CirculacionEstacion = require('../models/CirculacionEstacion');
const { sequelize } = require('../db/database');
const logger = require('../logger').logger;

function sinTilde(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function ordenadasPorRecorrido(paradas) {
    return [...paradas].sort((a, b) => Number(a.orden) - Number(b.orden));
}

function coincide(nombreEstacion, extremo) {
    const estacion = sinTilde(nombreEstacion);
    const declarado = sinTilde(extremo);
    return Boolean(estacion) && estacion === declarado;
}

function recorridoInvertido(paradas, origen, destino) {
    if (!paradas || paradas.length < 2) {
        return false;
    }
    const ordenadas = ordenadasPorRecorrido(paradas);
    const primera = ordenadas[0].nombre;
    const ultima = ordenadas[ordenadas.length - 1].nombre;
    if (coincide(primera, origen)) {
        return false;
    }
    return coincide(primera, destino) && coincide(ultima, origen);
}

function orientarParadas(paradas, origen, destino) {
    const ordenadas = ordenadasPorRecorrido(paradas || []);
    if (!recorridoInvertido(ordenadas, origen, destino)) {
        return ordenadas.map((parada, indice) => ({ ...parada, orden: indice + 1 }));
    }

    const orientadas = [];
    for (let i = 0; i < ordenadas.length; i += 1) {
        const estacion = ordenadas[ordenadas.length - 1 - i];
        const tiempos = ordenadas[i];
        orientadas.push({
            ...estacion,
            orden: i + 1,
            horaProgramadaLlegada: tiempos.horaProgramadaLlegada ?? null,
            horaProgramadaSalida: tiempos.horaProgramadaSalida ?? null,
            horaRealLlegada: tiempos.horaRealLlegada ?? null,
            horaRealSalida: tiempos.horaRealSalida ?? null
        });
    }
    return orientadas;
}

async function prepararParadas(estaciones, origen, destino) {
    if (!Array.isArray(estaciones) || estaciones.length === 0) {
        return estaciones || [];
    }
    const ids = [...new Set(estaciones.map(estacion => estacion.estacionId))];
    const filas = await Estacion.findAll({
        where: { id: ids },
        attributes: ['id', 'nombre']
    });
    const nombres = new Map(filas.map(estacion => [estacion.id, estacion.nombre]));
    const conNombre = estaciones.map(estacion => ({
        ...estacion,
        nombre: estacion.nombre || nombres.get(estacion.estacionId) || nombres.get(Number(estacion.estacionId)) || ''
    }));
    return orientarParadas(conNombre, origen, destino);
}

function paradasDelRegistro(registro, through) {
    return (registro.estaciones || []).map(estacion => {
        const parada = estacion[through] || {};
        return {
            id: parada.id,
            estacionId: estacion.id,
            nombre: estacion.nombre,
            orden: parada.orden,
            horaProgramadaLlegada: parada.horaProgramadaLlegada,
            horaProgramadaSalida: parada.horaProgramadaSalida,
            horaRealLlegada: parada.horaRealLlegada,
            horaRealSalida: parada.horaRealSalida
        };
    });
}

async function corregirModelo(Modelo, ModeloParada, through) {
    const registros = await Modelo.findAll({
        include: [{
            model: Estacion,
            as: 'estaciones',
            through: {
                attributes: ['id', 'orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 'horaRealLlegada', 'horaRealSalida']
            }
        }]
    });

    let cambiados = 0;
    for (const registro of registros) {
        const paradas = paradasDelRegistro(registro, through);
        if (!recorridoInvertido(paradas, registro.origen, registro.destino)) {
            continue;
        }
        const orientadas = orientarParadas(paradas, registro.origen, registro.destino);
        await sequelize.transaction(async (transaction) => {
            for (const parada of orientadas) {
                await ModeloParada.update(
                    { orden: parada.orden + 1000 },
                    { where: { id: parada.id }, transaction }
                );
            }
            for (const parada of orientadas) {
                await ModeloParada.update({
                    orden: parada.orden,
                    horaProgramadaLlegada: parada.horaProgramadaLlegada,
                    horaProgramadaSalida: parada.horaProgramadaSalida,
                    horaRealLlegada: parada.horaRealLlegada,
                    horaRealSalida: parada.horaRealSalida
                }, { where: { id: parada.id }, transaction });
            }
        });
        cambiados += 1;
    }
    return cambiados;
}

async function corregirItinerarios() {
    const itinerarios = await Itinerario.findAll();
    const paradas = await ItinerarioEstacion.findAll();
    const estaciones = await Estacion.findAll({ attributes: ['id', 'nombre'] });
    const nombres = new Map(estaciones.map(estacion => [estacion.id, estacion.nombre]));
    const porItinerario = new Map();
    paradas.forEach(parada => {
        const lista = porItinerario.get(parada.itinerarioId) || [];
        lista.push({
            id: parada.id,
            estacionId: parada.estacionId,
            nombre: nombres.get(parada.estacionId) || '',
            orden: parada.orden,
            horaProgramadaLlegada: parada.horaProgramadaLlegada,
            horaProgramadaSalida: parada.horaProgramadaSalida,
            horaRealLlegada: parada.horaRealLlegada,
            horaRealSalida: parada.horaRealSalida
        });
        porItinerario.set(parada.itinerarioId, lista);
    });

    let cambiados = 0;
    for (const itinerario of itinerarios) {
        const grupo = porItinerario.get(itinerario.id) || [];
        if (!recorridoInvertido(grupo, itinerario.origen, itinerario.destino)) {
            continue;
        }
        const orientadas = orientarParadas(grupo, itinerario.origen, itinerario.destino);
        await sequelize.transaction(async (transaction) => {
            for (const parada of orientadas) {
                await ItinerarioEstacion.update(
                    { orden: parada.orden + 1000 },
                    { where: { id: parada.id }, transaction }
                );
            }
            for (const parada of orientadas) {
                await ItinerarioEstacion.update({
                    orden: parada.orden,
                    horaProgramadaLlegada: parada.horaProgramadaLlegada,
                    horaProgramadaSalida: parada.horaProgramadaSalida,
                    horaRealLlegada: parada.horaRealLlegada,
                    horaRealSalida: parada.horaRealSalida
                }, { where: { id: parada.id }, transaction });
            }
        });
        cambiados += 1;
    }
    return cambiados;
}

async function corregirRecorridosInvertidos() {
    const itinerarios = await corregirItinerarios();
    const circulaciones = await corregirModelo(Circulacion, CirculacionEstacion, 'CirculacionEstacion');
    if (itinerarios > 0 || circulaciones > 0) {
        logger.info(`Recorridos orientados según origen y destino: ${itinerarios} itinerarios, ${circulaciones} circulaciones`);
    }
    return { itinerarios, circulaciones };
}

module.exports = {
    orientarParadas,
    prepararParadas,
    corregirRecorridosInvertidos
};
