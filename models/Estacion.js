const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const Estacion = sequelize.define('Estacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    ubicacion: {
        type: DataTypes.STRING
    },
    activa: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    gestion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'SIN_GESTION',
        comment: 'SIN_GESTION, MANUAL o AUTOMATICA'
    },
});

module.exports = Estacion; 