const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Itinerario = require('../models/Itinerario');
const ItinerarioSeleccionado = require('../models/ItinerarioSeleccionado');
const ItinerarioSeleccionadoEstacion = require('../models/ItinerarioSeleccionadoEstacion');
const Estacion = require('../models/Estacion');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const { ssp, sequelize } = require('../db/database');


const logLocation = 'controlEstacion.js: ';

// Obtener todos los itinerarios
router.get('/salidas', /*verificarAuth(['planificador', 'admin']),*/async (req, res) => {
    try {
        const fechaStart = req.query.cs_DateStart;

        const fechaEnd = req.query.cs_DateEnd;

        const estacion = req.query.cs_EstacionId;
        if (estacion && fechaStart && fechaEnd) {
            // Consulta usando Sequelize que cumple con todos los requisitos especificados
                                      // Consulta SQL compleja que cumple con todos los requisitos especificados
              const query = `
              SELECT DISTINCT its.* 
              FROM "ItinerarioSeleccionados" its
              INNER JOIN "ItinerarioSeleccionadoEstacions" ise ON its.id = ise."itinerarioSeleccionadoId"
              INNER JOIN "Estacions" e ON ise."estacionId" = e.id
              WHERE ise."estacionId" = $1 
              AND its.estado <> 'CANCELADO'
              AND ise."horaRealSalida" IS NULL 
              AND ise."horaRealLlegada" IS NOT NULL 
              AND ise."horaProgramadaSalida" < $2
              AND DATE(its.fecha) = DATE($3)
              AND (
                  -- Si existe una estación previa según orden, debe estar activa, gestionada y tener horaRealSalida no nula
                  NOT EXISTS (
                      SELECT 1 
                      FROM "ItinerarioSeleccionadoEstacions" ise_prev
                      INNER JOIN "Estacions" e_prev ON ise_prev."estacionId" = e_prev.id
                      WHERE ise_prev."itinerarioSeleccionadoId" = its.id 
                      AND ise_prev.orden < ise.orden
                      AND (e_prev.activa = false OR e_prev.gestionado = false OR ise_prev."horaRealSalida" IS NULL)
                  )
              )
          `;
             
             const result = await sequelize.query(query, {
                 bind: [estacion, fechaEnd, fechaEnd],
                 type: sequelize.QueryTypes.SELECT
             });

             res.json(result);
            return;
        }
    } catch (error) {
        logger.error(logLocation + 'Error al obtener salidas:', error);
        res.status(500).json({ mensaje: 'Error al obtener salidas' });
    }
});

router.get('/llegadas', /*verificarAuth(['planificador', 'admin']),*/ async (req, res) => {
    try {
        const fechaStart = req.query.cs_DateStart;

        const fechaEnd = req.query.cs_DateEnd;

        const estacion = req.query.cs_EstacionId;
        if (estacion && fechaStart && fechaEnd) {
            // Consulta usando Sequelize que cumple con todos los requisitos especificados
                                      // Consulta SQL compleja que cumple con todos los requisitos especificados
              const query = `
              SELECT DISTINCT its.* 
              FROM "ItinerarioSeleccionados" its
              INNER JOIN "ItinerarioSeleccionadoEstacions" ise ON its.id = ise."itinerarioSeleccionadoId"
              INNER JOIN "Estacions" e ON ise."estacionId" = e.id
              WHERE ise."estacionId" = $1 
              AND its.estado <> 'CANCELADO'
              AND ise."horaRealSalida" IS NULL 
              AND ise."horaRealLlegada" IS NULL 
              AND ise."horaProgramadaSalida" < $2
              AND DATE(its.fecha) = DATE($3)
              AND (
                  -- Si existe una estación previa según orden, debe estar activa, gestionada y tener horaRealSalida no nula
                  NOT EXISTS (
                      SELECT 1 
                      FROM "ItinerarioSeleccionadoEstacions" ise_prev
                      INNER JOIN "Estacions" e_prev ON ise_prev."estacionId" = e_prev.id
                      WHERE ise_prev."itinerarioSeleccionadoId" = its.id 
                      AND ise_prev.orden < ise.orden
                      AND (e_prev.activa = false OR e_prev.gestionado = false OR ise_prev."horaRealSalida" IS NULL)
                  )
              )
          `;
             
             const result = await sequelize.query(query, {
                 bind: [estacion, fechaEnd, fechaEnd],
                 type: sequelize.QueryTypes.SELECT
             });

             res.json(result);
            return;
        }
    } catch (error) {
        logger.error(logLocation + 'Error al obtener salidas:', error);
        res.status(500).json({ mensaje: 'Error al obtener salidas' });
    }
});


module.exports = router; 