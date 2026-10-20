const express = require('express');
const router = express.Router();
const Circulacion = require('../models/Circulacion');
const CirculacionEstacion = require('../models/CirculacionEstacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const { sequelize } = require('../db/database');

const logLocation = 'controlEstacion.js: ';

function horaActual() {
    const ahora = new Date();
    const dosDigitos = (valor) => String(valor).padStart(2, '0');
    return `${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}:${dosDigitos(ahora.getSeconds())}`;
}

function margenHoras(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
        return 2;
    }
    return Math.min(numero, 24);
}

function consultaMovimientos(esSalida) {
    const columnaHora = esSalida ? 'ise."horaProgramadaSalida"' : 'ise."horaProgramadaLlegada"';
    const condicionParada = esSalida
        ? `ise."horaProgramadaSalida" IS NOT NULL
           AND ise."horaRealSalida" IS NULL`
        : `ise."horaProgramadaLlegada" IS NOT NULL
           AND ise."horaRealLlegada" IS NULL`;
    const orden = columnaHora;

    return `
        SELECT DISTINCT
            its.id,
            its.numero,
            its.origen,
            its.destino,
            its.fecha,
            its.estado,
            its.tipo,
            its.material,
            ise."horaProgramadaLlegada",
            ise."horaProgramadaSalida",
            ise.orden
        FROM "Circulaciones" its
        INNER JOIN "CirculacionEstaciones" ise ON its.id = ise."circulacionId"
        INNER JOIN "Estacions" e ON ise."estacionId" = e.id
        WHERE ise."estacionId" = $1
        AND its.estado <> 'CANCELADO'
        AND ${condicionParada}
        AND (
            ((its.fecha AT TIME ZONE 'Europe/Madrid')::date + ${columnaHora})
            AT TIME ZONE 'Europe/Madrid'
        ) BETWEEN $2::timestamptz AND $3::timestamptz
        AND (
            NOT EXISTS (
                SELECT 1
                FROM "CirculacionEstaciones" ise_prev
                INNER JOIN "Estacions" e_prev ON ise_prev."estacionId" = e_prev.id
                WHERE ise_prev."circulacionId" = its.id
                AND ise_prev.orden < ise.orden
                AND e_prev.gestionado = true
                AND (e_prev.activa = false OR ise_prev."horaRealSalida" IS NULL)
            )
        )
        ORDER BY ${orden} ASC, its.numero ASC
    `;
}

async function listarMovimientos(req, res, esSalida) {
    const estacion = req.query.cs_EstacionId;
    const horas = margenHoras(req.query.cs_Horas);
    const instante = new Date(req.query.cs_Ahora);
    const ahora = Number.isNaN(instante.getTime()) ? new Date() : instante;
    const milisegundos = horas * 60 * 60 * 1000;

    if (!estacion) {
        return res.status(400).json({ mensaje: 'Falta la estación' });
    }

    const result = await sequelize.query(consultaMovimientos(esSalida), {
        bind: [
            estacion,
            new Date(ahora.getTime() - milisegundos).toISOString(),
            new Date(ahora.getTime() + milisegundos).toISOString()
        ],
        type: sequelize.QueryTypes.SELECT
    });

    res.json(result);
}

router.get('/salidas', async (req, res) => {
    try {
        await listarMovimientos(req, res, true);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener salidas:', error);
        res.status(500).json({ mensaje: 'Error al obtener salidas' });
    }
});

router.get('/llegadas', async (req, res) => {
    try {
        await listarMovimientos(req, res, false);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener llegadas:', error);
        res.status(500).json({ mensaje: 'Error al obtener llegadas' });
    }
});

async function buscarParada(circulacionId, estacionId) {
    if (!circulacionId || !estacionId) {
        return null;
    }

    return CirculacionEstacion.findOne({
        where: {
            circulacionId,
            estacionId
        }
    });
}

router.post('/llegada', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { circulacionId, estacionId } = req.body;
        const parada = await buscarParada(circulacionId, estacionId);

        if (!parada) {
            return res.status(404).json({ mensaje: 'Parada no encontrada' });
        }

        const circulacion = await Circulacion.findByPk(circulacionId);
        if (!circulacion || circulacion.estado === 'CANCELADO') {
            return res.status(409).json({ mensaje: 'La circulación está cancelada' });
        }

        if (!parada.horaRealLlegada) {
            await parada.update({ horaRealLlegada: horaActual() });
        }

        const ultimaParada = await CirculacionEstacion.max('orden', {
            where: { circulacionId }
        });

        if (Number(parada.orden) === Number(ultimaParada)) {
            await circulacion.update({ estado: 'COMPLETADO' });
        } else if (circulacion.estado === 'PENDIENTE') {
            await circulacion.update({ estado: 'EN_PROGRESO' });
        }

        res.json({ mensaje: 'Llegada registrada', horaRealLlegada: parada.horaRealLlegada });
    } catch (error) {
        logger.error(logLocation + 'Error al registrar la llegada:', error);
        res.status(500).json({ mensaje: 'Error al registrar la llegada' });
    }
});

router.post('/salida', verificarAuth(['planificador', 'admin']), async (req, res) => {
    try {
        const { circulacionId, estacionId } = req.body;
        const parada = await buscarParada(circulacionId, estacionId);

        if (!parada) {
            return res.status(404).json({ mensaje: 'Parada no encontrada' });
        }

        const circulacion = await Circulacion.findByPk(circulacionId);
        if (!circulacion || circulacion.estado === 'CANCELADO') {
            return res.status(409).json({ mensaje: 'La circulación está cancelada' });
        }

        if (!parada.horaRealSalida) {
            await parada.update({ horaRealSalida: horaActual() });
        }

        const ultimaParada = await CirculacionEstacion.max('orden', {
            where: { circulacionId }
        });

        if (Number(parada.orden) === Number(ultimaParada)) {
            await circulacion.update({ estado: 'COMPLETADO' });
        } else if (circulacion.estado === 'PENDIENTE') {
            await circulacion.update({ estado: 'EN_PROGRESO' });
        }

        res.json({ mensaje: 'Salida registrada', horaRealSalida: parada.horaRealSalida });
    } catch (error) {
        logger.error(logLocation + 'Error al registrar la salida:', error);
        res.status(500).json({ mensaje: 'Error al registrar la salida' });
    }
});

module.exports = router;
