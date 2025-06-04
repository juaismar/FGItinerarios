const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');
const bcrypt = require('bcrypt');
const { ROLES, ROLES_DESCRIPCION } = require('../config/roles');

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [6, 100]
        }
    },
    rol: {
        type: DataTypes.ENUM(Object.values(ROLES)),
        allowNull: false,
        defaultValue: ROLES.PLANIFICADOR
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    ultimoAcceso: {
        type: DataTypes.DATE
    }
}, {
    hooks: {
        beforeCreate: async (usuario) => {
            if (usuario.password) {
                usuario.password = await bcrypt.hash(usuario.password, 10);
            }
        },
        beforeUpdate: async (usuario) => {
            if (usuario.changed('password')) {
                usuario.password = await bcrypt.hash(usuario.password, 10);
            }
        }
    }
});

// Métodos de instancia
Usuario.prototype.tieneRol = function(rol) {
    return this.rol === rol;
};

Usuario.prototype.descripcionRol = function() {
    return ROLES_DESCRIPCION[this.rol] || 'Rol desconocido';
};

// Getters para roles
Object.defineProperty(Usuario.prototype, 'esAdmin', {
    get() {
        return this.rol === ROLES.ADMIN;
    }
});

Object.defineProperty(Usuario.prototype, 'esPlanificador', {
    get() {
        return this.rol === ROLES.PLANIFICADOR;
    }
});

// Método para verificar contraseña
Usuario.prototype.verificarPassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

module.exports = Usuario; 