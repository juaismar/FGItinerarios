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
    gestionado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
});

module.exports = Estacion; 