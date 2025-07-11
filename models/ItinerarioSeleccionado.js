const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');
const Estacion = require('./Estacion');
const ItinerarioSeleccionadoEstacion = require('./ItinerarioSeleccionadoEstacion');

const ItinerarioSeleccionado = sequelize.define('ItinerarioSeleccionado', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numero: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    origen: {
        type: DataTypes.STRING,
        allowNull: false
    },
    destino: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Fecha y hora completa del itinerario'
    },
    tipo: {
        type: DataTypes.STRING,
        comment: 'Tipo de tren o servicio'
    },
    material: {
        type: DataTypes.STRING,
        comment: 'Material rodante asignado'
    },
    observaciones: {
        type: DataTypes.TEXT
    },
    estado: {
        type: DataTypes.ENUM('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'),
        defaultValue: 'PENDIENTE'
    },
});

// Relaciones
ItinerarioSeleccionado.belongsToMany(Estacion, { 
    through: ItinerarioSeleccionadoEstacion,
    as: 'estaciones'
});
Estacion.belongsToMany(ItinerarioSeleccionado, { 
    through: ItinerarioSeleccionadoEstacion,
    as: 'itinerariosSeleccionados'
});

// Métodos de instancia
ItinerarioSeleccionado.prototype.obtenerEstacionesOrdenadas = async function() {
    return await this.getEstaciones({
        through: {
            attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 
                        'horaRealLlegada', 'horaRealSalida', 'observaciones']
        },
        order: [[ItinerarioSeleccionadoEstacion, 'orden', 'ASC']]
    });
};

module.exports = ItinerarioSeleccionado; 