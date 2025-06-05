const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');
const Estacion = require('./Estacion');
const ItinerarioEstacion = require('./ItinerarioEstacion');

const Itinerario = sequelize.define('Itinerario', {
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
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(['pendiente', 'en_proceso', 'completado', 'cancelado']),
        defaultValue: 'pendiente'
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
    }
});

// Relaciones
Itinerario.belongsToMany(Estacion, { 
    through: ItinerarioEstacion,
    as: 'estaciones'
});
Estacion.belongsToMany(Itinerario, { 
    through: ItinerarioEstacion,
    as: 'itinerarios'
});

// Métodos de instancia
Itinerario.prototype.obtenerEstacionesOrdenadas = async function() {
    return await this.getEstaciones({
        through: {
            attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 
                        'horaRealLlegada', 'horaRealSalida', 'observaciones']
        },
        order: [[ItinerarioEstacion, 'orden', 'ASC']]
    });
};

module.exports = Itinerario; 