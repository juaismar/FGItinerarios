const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');
const Estacion = require('./Estacion');
const CirculacionEstacion = require('./CirculacionEstacion');

const Circulacion = sequelize.define('Circulacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numero: {
        type: DataTypes.STRING,
        allowNull: false
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
        comment: 'Fecha y hora completa de la circulación'
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
}, {
    tableName: 'Circulaciones',
    indexes: [
        {
            unique: true,
            fields: ['numero', 'fecha'],
            name: 'circulacion_numero_fecha_unique'
        }
    ]
});

// Relaciones
Circulacion.belongsToMany(Estacion, { 
    through: CirculacionEstacion,
    as: 'estaciones',
    foreignKey: 'circulacionId',
    otherKey: 'estacionId'
});
Estacion.belongsToMany(Circulacion, { 
    through: CirculacionEstacion,
    as: 'circulaciones',
    foreignKey: 'estacionId',
    otherKey: 'circulacionId'
});

// Métodos de instancia
Circulacion.prototype.obtenerEstacionesOrdenadas = async function() {
    return await this.getEstaciones({
        through: {
            attributes: ['orden', 'horaProgramadaLlegada', 'horaProgramadaSalida', 
                        'horaRealLlegada', 'horaRealSalida', 'observaciones']
        },
        order: [[CirculacionEstacion, 'orden', 'ASC']]
    });
};

module.exports = Circulacion; 