const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const ItinerarioEstacion = sequelize.define('ItinerarioEstacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    itinerarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Itinerarios',
            key: 'id'
        }
    },
    estacionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Estacions',
            key: 'id'
        }
    },
    orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Orden de la estación en el itinerario'
    },
    horaProgramadaLlegada: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Hora programada de llegada a la estación'
    },
    horaProgramadaSalida: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Hora programada de salida de la estación'
    },
    horaRealLlegada: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Hora real de llegada a la estación'
    },
    horaRealSalida: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Hora real de salida de la estación'
    },
    observaciones: {
        type: DataTypes.TEXT,
        comment: 'Observaciones sobre la parada en esta estación'
    }
});

module.exports = ItinerarioEstacion; 