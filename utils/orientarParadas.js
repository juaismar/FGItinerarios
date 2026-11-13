const Estacion = require('../models/Estacion');


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


module.exports = {
    prepararParadas
};
