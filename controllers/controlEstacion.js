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
    const columnaReal = esSalida ? 'ise."horaRealSalida"' : 'ise."horaRealLlegada"';
    const condicionParada = `${columnaHora} IS NOT NULL
           AND (e.gestion = 'AUTOMATICA' OR ${columnaReal} IS NULL)`;
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
            ise."horaRealLlegada",
            ise."horaRealSalida",
            ise."retrasoPrevisto",
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

router.get('/salidas', verificarAuth('planificador'), async (req, res) => {
    try {
        await listarMovimientos(req, res, true);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener salidas:', error);
        res.status(500).json({ mensaje: 'Error al obtener salidas' });
    }
});

router.get('/llegadas', verificarAuth('planificador'), async (req, res) => {
    try {
        await listarMovimientos(req, res, false);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener llegadas:', error);
        res.status(500).json({ mensaje: 'Error al obtener llegadas' });
    }
});

async function marcarHoraReal(parada, estacionId, columna) {
    const estacion = await Estacion.findByPk(estacionId);
    const automatica = estacion && estacion.activa === true && estacion.gestion === 'AUTOMATICA';
    if (!parada[columna] || automatica) {
        await parada.update({ [columna]: horaActual() });
    }
}

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

router.post('/llegada', verificarAuth('planificador'), async (req, res) => {
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

        await marcarHoraReal(parada, estacionId, 'horaRealLlegada');

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

router.post('/salida', verificarAuth('planificador'), async (req, res) => {
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

        await marcarHoraReal(parada, estacionId, 'horaRealSalida');

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
const RETRASO_MINIMO = 3;
const RETRASO_MAXIMO = 12 * 60;

function partesHora(hora) {
    const texto = String(hora || '').slice(0, 8);
    const partes = texto.split(':');
    if (partes.length < 2) {
        return null;
    }
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    const segundos = Number(partes[2] || 0);
    if (!Number.isInteger(horas) || !Number.isInteger(minutos) || !Number.isInteger(segundos)) {
        return null;
    }
    return { horas, minutos, segundos };
}

function horaConRetraso(programada, minutosRetraso) {
    const partes = partesHora(programada);
    if (!partes) {
        return null;
    }
    const total = partes.horas * 60 + partes.minutos + minutosRetraso;
    const dia = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    const dosDigitos = (valor) => String(valor).padStart(2, '0');
    return `${dosDigitos(Math.floor(dia / 60))}:${dosDigitos(dia % 60)}:${dosDigitos(partes.segundos)}`;
}

function minutosRetrasoValidos(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return { minutos: null };
    }
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < RETRASO_MINIMO || numero > RETRASO_MAXIMO) {
        return null;
    }
    return { minutos: numero };
}

function horasCoinciden(actual, esperada) {
    if (!actual || !esperada) {
        return false;
    }
    return String(actual).slice(0, 8) === String(esperada).slice(0, 8);
}

router.post('/retraso', verificarAuth('planificador'), async (req, res) => {
    try {
        const { circulacionId, estacionId } = req.body;
        const retraso = minutosRetrasoValidos(req.body.minutos);

        if (!estacionId) {
            return res.status(400).json({ codigo: 'FALTA_ESTACION', mensaje: 'Falta la estación' });
        }
        if (!retraso) {
            return res.status(400).json({
                codigo: 'RETRASO_NO_VALIDO',
                minimo: RETRASO_MINIMO,
                maximo: RETRASO_MAXIMO,
                mensaje: `El retraso tiene que ser entre ${RETRASO_MINIMO} y ${RETRASO_MAXIMO} minutos`
            });
        }

        const estacion = await Estacion.findByPk(estacionId);
        if (!estacion || estacion.activa !== true || !GESTIONES_CONTROL.includes(estacion.gestion)) {
            return res.status(409).json({
                codigo: 'ESTACION_NO_AUTOMATICA',
                mensaje: 'El retraso previsto solo se anota en una estación de gestión manual o automática'
            });
        }

        const parada = await buscarParada(circulacionId, estacionId);
        if (!parada) {
            return res.status(404).json({ codigo: 'PARADA_NO_ENCONTRADA', mensaje: 'Parada no encontrada' });
        }

        const circulacion = await Circulacion.findByPk(circulacionId);
        if (!circulacion || circulacion.estado === 'CANCELADO') {
            return res.status(409).json({ codigo: 'CIRCULACION_CANCELADA', mensaje: 'La circulación está cancelada' });
        }

        const cambios = { retrasoPrevisto: retraso.minutos };
        if (estacion.gestion === 'AUTOMATICA') {
            const anterior = Number.isInteger(parada.retrasoPrevisto) ? parada.retrasoPrevisto : 0;
            const nuevo = retraso.minutos || 0;
            ['Llegada', 'Salida'].forEach((lado) => {
                const programada = parada['horaProgramada' + lado];
                const real = parada['horaReal' + lado];
                if (!programada || !real) {
                    return;
                }
                if (horasCoinciden(real, horaConRetraso(programada, anterior))) {
                    cambios['horaReal' + lado] = horaConRetraso(programada, nuevo);
                }
            });
        }

        await parada.update(cambios);
        if (estacion.gestion === 'AUTOMATICA') {
            await actualizarEstadosAutomaticos(circulacionId);
        }

        res.json({ mensaje: 'Retraso previsto anotado', retrasoPrevisto: parada.retrasoPrevisto });
    } catch (error) {
        logger.error(logLocation + 'Error al anotar el retraso:', error);
        res.status(500).json({ mensaje: 'Error al anotar el retraso' });
    }
});

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

function instanteConRetraso(columna) {
    return `(
        (c.fecha AT TIME ZONE 'Europe/Madrid')::date
        + ise."${columna}"
        + (COALESCE(ise."retrasoPrevisto", 0) * INTERVAL '1 minute')
    ) AT TIME ZONE 'Europe/Madrid'`;
}

function horaMarcadaConRetraso(columna) {
    return `(
        ise."${columna}"
        + (COALESCE(ise."retrasoPrevisto", 0) * INTERVAL '1 minute')
    )::time`;
}

function instanteCumplido(columnaReal, columnaProgramada) {
    return `(
        (c.fecha AT TIME ZONE 'Europe/Madrid')::date
        + ise."${columnaReal}"
        + CASE
            WHEN ise."${columnaProgramada}" IS NOT NULL
             AND ise."${columnaReal}" < ise."${columnaProgramada}"
            THEN INTERVAL '1 day'
            ELSE INTERVAL '0'
          END
    ) AT TIME ZONE 'Europe/Madrid' <= NOW()`;
}

async function actualizarEstadosAutomaticos(circulacionId, transaction) {
    const filtro = circulacionId ? 'AND c.id = $1' : '';
    const opciones = {};
    if (transaction) {
        opciones.transaction = transaction;
    }
    if (circulacionId) {
        opciones.bind = [circulacionId];
    }

    await sequelize.query(`
        UPDATE "Circulaciones" AS c
        SET estado = 'EN_PROGRESO'
        WHERE c.estado = 'PENDIENTE'
        ${filtro}
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
            AND ${instanteCumplido('horaRealSalida', 'horaProgramadaSalida')}
        )
    `, opciones);

    await sequelize.query(`
        UPDATE "Circulaciones" AS c
        SET estado = 'COMPLETADO'
        WHERE c.estado IN ('PENDIENTE', 'EN_PROGRESO')
        ${filtro}
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
                (
                    ise."horaProgramadaLlegada" IS NOT NULL
                    AND ise."horaRealLlegada" IS NOT NULL
                    AND ${instanteCumplido('horaRealLlegada', 'horaProgramadaLlegada')}
                )
                OR (
                    ise."horaProgramadaLlegada" IS NULL
                    AND ise."horaProgramadaSalida" IS NOT NULL
                    AND ise."horaRealSalida" IS NOT NULL
                    AND ${instanteCumplido('horaRealSalida', 'horaProgramadaSalida')}
                )
            )
        )
    `, opciones);
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
                SET "${columnaReal}" = ${horaMarcadaConRetraso(columnaProgramada)}
                FROM "Circulaciones" AS c, "Estacions" AS e
                WHERE ise."circulacionId" = c.id
                AND ise."estacionId" = e.id
                AND e.gestion = 'AUTOMATICA'
                AND e.activa = true
                AND c.estado <> 'CANCELADO'
                AND ise."${columnaProgramada}" IS NOT NULL
                AND ise."${columnaReal}" IS NULL
                AND ${instanteConRetraso(columnaProgramada)} ${ventana}
            `, { transaction });
            return filas(respuesta);
        };

        const llegadas = await marca('horaRealLlegada', 'horaProgramadaLlegada');
        const salidas = await marca('horaRealSalida', 'horaProgramadaSalida');
        await actualizarEstadosAutomaticos(null, transaction);

        const total = llegadas + salidas;
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
