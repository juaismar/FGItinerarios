const express = require('express');
const router = express.Router();
const logger = require('../logger').logger;
const { verificarAuth } = require('../middleware/auth');
const { ssp } = require('../db/database');

const logLocation = 'panel.js: ';

// Obtener todas las estaciones de itinerarios seleccionados con paginación
router.get('/paginated', async (req, res) => {
    try {
        const columns = [
            { db: 'id', dt: 'id', formatter: null },
            { db: 'itinerarioSeleccionadoId', dt: 'itinerarioSeleccionadoId', formatter: null },
            { db: 'estacionId', dt: 'estacionId', formatter: null },
            { db: 'orden', dt: 'orden', formatter: null },
            { db: 'horaProgramadaLlegada', dt: 'horaProgramadaLlegada', formatter: null },
            { db: 'horaProgramadaSalida', dt: 'horaProgramadaSalida', formatter: null },
            { db: 'horaRealLlegada', dt: 'horaRealLlegada', formatter: null },
            { db: 'horaRealSalida', dt: 'horaRealSalida', formatter: null },
            { db: 'via', dt: 'via', formatter: null },
            { db: 'observaciones', dt: 'observaciones', formatter: null }
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

        const result = await ssp.Complex(req.query, 'ItinerarioSeleccionadoEstacions', columns, whereResult, whereAll);
        res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener estaciones de itinerarios seleccionados paginadas:', error);
        res.status(500).json({ mensaje: 'Error al obtener estaciones de itinerarios seleccionados' });
    }
});


module.exports = router; 