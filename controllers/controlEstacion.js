const express = require('express');
const router = express.Router();
const Circulacion = require('../models/Circulacion');
const CirculacionEstacion = require('../models/CirculacionEstacion');
const Estacion = require('../models/Estacion');
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
        AND e.gestion IN ('MANUAL', 'AUTOMATICA')
        AND e.activa = true
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
                AND e_prev.gestion = 'MANUAL'
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
        return res.status(400).json({ codigo: 'FALTA_ESTACION', mensaje: 'Falta la estación' });
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
            return res.status(404).json({ codigo: 'PARADA_NO_ENCONTRADA', mensaje: 'Parada no encontrada' });
        }

        const circulacion = await Circulacion.findByPk(circulacionId);
        if (!circulacion || circulacion.estado === 'CANCELADO') {
            return res.status(409).json({ codigo: 'CIRCULACION_CANCELADA', mensaje: 'La circulación está cancelada' });
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
            return res.status(404).json({ codigo: 'PARADA_NO_ENCONTRADA', mensaje: 'Parada no encontrada' });
        }

        const circulacion = await Circulacion.findByPk(circulacionId);
        if (!circulacion || circulacion.estado === 'CANCELADO') {
            return res.status(409).json({ codigo: 'CIRCULACION_CANCELADA', mensaje: 'La circulación está cancelada' });
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

const GESTIONES_CONTROL = ['MANUAL', 'AUTOMATICA'];

router.put('/gestion', verificarAuth('planificador'), async (req, res) => {
    try {
        const { estacionId, gestion } = req.body;

        if (!estacionId) {
            return res.status(400).json({ codigo: 'FALTA_ESTACION', mensaje: 'Falta la estación' });
        }

        if (!GESTIONES_CONTROL.includes(gestion)) {
            return res.status(400).json({
                codigo: 'GESTION_NO_VALIDA',
                mensaje: 'La gestión debe ser manual o automática'
            });
        }

        const estacion = await Estacion.findByPk(estacionId);
        if (!estacion || estacion.activa !== true || !GESTIONES_CONTROL.includes(estacion.gestion)) {
            return res.status(404).json({
                codigo: 'ESTACION_NO_GESTIONABLE',
                mensaje: 'La estación no admite cambio de gestión desde el control'
            });
        }

        if (estacion.gestion !== gestion) {
            await estacion.update({ gestion });
            logger.info(logLocation + `Estación ${estacion.id} pasa a gestión ${gestion}`);
        }

        res.json({ id: estacion.id, gestion: estacion.gestion });
    } catch (error) {
        logger.error(logLocation + 'Error al cambiar la gestión:', error);
        res.status(500).json({ mensaje: 'Error al cambiar la gestión' });
    }
});

let marcadoEnCurso = null;

function instanteProgramado(columna) {
    return `((c.fecha AT TIME ZONE 'Europe/Madrid')::date + ise."${columna}") AT TIME ZONE 'Europe/Madrid'`;
}

async function aplicarGestionAutomatica() {
    if (marcadoEnCurso) {
        return marcadoEnCurso;
    }

    marcadoEnCurso = sequelize.transaction(async (transaction) => {
        const ventana = `BETWEEN NOW() - INTERVAL '36 hours' AND NOW()`;
        const filas = (respuesta) => {
            const resultado = Array.isArray(respuesta) ? (respuesta[1] || respuesta[0]) : respuesta;
            return (resultado && resultado.rowCount) || 0;
        };
        const marca = async (columnaReal, columnaProgramada) => {
            const respuesta = await sequelize.query(`
                UPDATE "CirculacionEstaciones" AS ise
                SET "${columnaReal}" = ise."${columnaProgramada}"
                FROM "Circulaciones" AS c, "Estacions" AS e
                WHERE ise."circulacionId" = c.id
                AND ise."estacionId" = e.id
                AND e.gestion = 'AUTOMATICA'
                AND e.activa = true
                AND c.estado <> 'CANCELADO'
                AND ise."${columnaProgramada}" IS NOT NULL
                AND ise."${columnaReal}" IS NULL
                AND ${instanteProgramado(columnaProgramada)} ${ventana}
            `, { transaction });
            return filas(respuesta);
        };

        const llegadas = await marca('horaRealLlegada', 'horaProgramadaLlegada');
        const salidas = await marca('horaRealSalida', 'horaProgramadaSalida');

        const enProgreso = filas(await sequelize.query(`
            UPDATE "Circulaciones" AS c
            SET estado = 'EN_PROGRESO'
            WHERE c.estado = 'PENDIENTE'
            AND EXISTS (
                SELECT 1
                FROM "CirculacionEstaciones" AS ise
                INNER JOIN "Estacions" AS e ON e.id = ise."estacionId"
                WHERE ise."circulacionId" = c.id
                AND e.gestion = 'AUTOMATICA'
                AND e.activa = true
                AND ise.orden = (
                    SELECT MIN(orden) FROM "CirculacionEstaciones" AS primera
                    WHERE primera."circulacionId" = c.id
                )
                AND ise."horaRealSalida" IS NOT NULL
            )
        `, { transaction }));

        const completadas = filas(await sequelize.query(`
            UPDATE "Circulaciones" AS c
            SET estado = 'COMPLETADO'
            WHERE c.estado IN ('PENDIENTE', 'EN_PROGRESO')
            AND EXISTS (
                SELECT 1
                FROM "CirculacionEstaciones" AS ise
                INNER JOIN "Estacions" AS e ON e.id = ise."estacionId"
                WHERE ise."circulacionId" = c.id
                AND e.gestion = 'AUTOMATICA'
                AND e.activa = true
                AND ise.orden = (
                    SELECT MAX(orden) FROM "CirculacionEstaciones" AS ultima
                    WHERE ultima."circulacionId" = c.id
                )
                AND (
                    (ise."horaProgramadaLlegada" IS NOT NULL AND ise."horaRealLlegada" IS NOT NULL)
                    OR (
                        ise."horaProgramadaLlegada" IS NULL
                        AND ise."horaProgramadaSalida" IS NOT NULL
                        AND ise."horaRealSalida" IS NOT NULL
                    )
                )
            )
        `, { transaction }));

        const total = llegadas + salidas + enProgreso + completadas;
        if (total > 0) {
            logger.info(logLocation + `Gestión automática: ${llegadas} llegadas, ${salidas} salidas`);
        }
    }).finally(() => {
        marcadoEnCurso = null;
    });

    return marcadoEnCurso;
}

module.exports = router;
module.exports.aplicarGestionAutomatica = aplicarGestionAutomatica;
