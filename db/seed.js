require('dotenv').config();
const { sequelize } = require('./database');
const Usuario = require('../models/Usuario');
const Estacion = require('../models/Estacion');
const Itinerario = require('../models/Itinerario');
const ItinerarioEstacion = require('../models/ItinerarioEstacion');
const bcrypt = require('bcrypt');
const logger = require('../logger').logger;
const { ROLES } = require('../config/roles');

const logLocation = 'seed.js: ';

async function seed() {
    // Sincronizar la base de datos
    await sequelize.sync({ alter: true });
    logger.info(logLocation + 'Base de datos sincronizada');

    await seedUsers();
    await seedEstaciones();
    await seedItinerarios();
}

async function seedEstaciones() {
    try {
        

        // Verificar si ya existe un usuario administrador
        const adminExists = await Usuario.findOne({
            where: {
                email: 'admin@fgitinerarios.com'
            }
        });

        if (!adminExists) {
            // Crear usuario admin por defecto
            await Usuario.create({
                nombre: 'Administrador',
                email: 'admin@fgitinerarios.com',
                password: 'Admin123!',
                rol: ROLES.ADMIN,
                activo: true
            });
            logger.info(logLocation + 'Usuario administrador creado correctamente');
        } else {
            logger.info(logLocation + 'El usuario administrador ya existe');
        }

        // Verificar si ya existen estaciones
        const estacionesExistentes = await Estacion.count();
        
        if (estacionesExistentes === 0) {
            // Crear estaciones iniciales
            const estaciones = [
                {
                    nombre: 'Granja',
                    codigo: 'GRJ',
                    ubicacion: '-',
                    activa: true
                },
                {
                    nombre: 'Aljibe',
                    codigo: 'ALJ',
                    ubicacion: '-',
                    activa: true
                },
                {
                    nombre: 'Font',
                    codigo: 'FNT',
                    ubicacion: '-',
                    activa: true
                },
                {
                    nombre: 'Pista',
                    codigo: 'PST',
                    ubicacion: '-',
                    activa: true
                },
                {
                    nombre: 'Mirador',
                    codigo: 'MIR',
                    ubicacion: '-',
                    activa: true
                },
                {
                    nombre: 'Racó',
                    codigo: 'RCO',
                    ubicacion: '-',
                    activa: true
                },
                {
                    nombre: 'Taller',
                    codigo: 'TLL',
                    ubicacion: '-',
                    activa: true
                }
            ];

            await Estacion.bulkCreate(estaciones);
            logger.info(logLocation + 'Estaciones iniciales creadas');
        }

        logger.info(logLocation + 'Seed completado exitosamente');
    } catch (error) {
        logger.error(logLocation + 'Error en seed: ' + error);
        throw error; // Re-lanzar el error para que pueda ser manejado por el servidor
    }
}
async function seedUsers() {
    try {

        // Verificar si ya existe un usuario administrador
        const adminExists = await Usuario.findOne({
            where: {
                email: 'admin@fgitinerarios.com'
            }
        });

        if (!adminExists) {
            // Crear usuario admin por defecto
            await Usuario.create({
                nombre: 'Administrador',
                email: 'admin@fgitinerarios.com',
                password: 'Admin123!',
                rol: ROLES.ADMIN,
                activo: true
            });
            logger.info(logLocation + 'Usuario administrador creado correctamente');
        } else {
            logger.info(logLocation + 'El usuario administrador ya existe');
        }
    } catch (error) {
        logger.error(logLocation + 'Error en seed: ' + error);
        throw error; // Re-lanzar el error para que pueda ser manejado por el servidor
    }
}

async function seedItinerarios() {
    try {
        // Verificar si ya existen itinerarios
        const itinerariosExistentes = await Itinerario.count();
        
        if (itinerariosExistentes === 0) {
            // Obtener todas las estaciones
            const estaciones = await Estacion.findAll();
            if (estaciones.length === 0) {
                throw new Error('No se encontraron estaciones');
            }

            // Crear itinerarios de ejemplo
            const itinerarios = [
                {
                    numero: '100',
                    origen: 'Granja',
                    destino: 'Racó',
                    fecha: new Date(),
                    estado: 'pendiente',
                    tipo: 'Viajeros ordinario',
                    material: 'Romulus 2, 10-3º clase',
                    observaciones: 'Itinerario de ejemplo 1',
                    estaciones: [
                        { codigo: 'GRJ', orden: 1, llegada: '10:00', salida: '10:07' },
                        { codigo: 'ALJ', orden: 2, llegada: '10:09', salida: '10:09' },
                        { codigo: 'FNT', orden: 3, llegada: '10:11', salida: '10:12' },
                        { codigo: 'PST', orden: 4, llegada: '10:14', salida: '10:14' },
                        { codigo: 'MIR', orden: 5, llegada: '10:16', salida: '10:16' },
                        { codigo: 'RCO', orden: 6, llegada: '10:18', salida: '10:18' }
                    ]
                },
                {
                    numero: '101',
                    origen: 'Racó',
                    destino: 'Granja',
                    fecha: new Date(),
                    estado: 'pendiente',
                    tipo: 'Viajeros ordinario',
                    material: '101, 5-2º clase',
                    observaciones: 'Itinerario de ejemplo 2',
                    estaciones: [
                        { codigo: 'RCO', orden: 1, llegada: '10:05', salida: '10:05' },
                        { codigo: 'MIR', orden: 2, llegada: '10:07', salida: '10:07' },
                        { codigo: 'PST', orden: 3, llegada: '10:09', salida: '10:09' },
                        { codigo: 'FNT', orden: 4, llegada: '10:11', salida: '10:12' },
                        { codigo: 'ALJ', orden: 5, llegada: '10:14', salida: '10:14' },
                        { codigo: 'GRJ', orden: 6, llegada: '10:16', salida: '10:16' }
                    ]
                },
                {
                    numero: '102',
                    origen: 'Granja',
                    destino: 'Racó',
                    fecha: new Date(),
                    estado: 'pendiente',
                    tipo: 'Viajeros ordinario',
                    material: 'Romulus 2, 10-3º clase',
                    observaciones: 'Itinerario tarde',
                    estaciones: [
                        { codigo: 'GRJ', orden: 1, llegada: '15:00', salida: '15:07' },
                        { codigo: 'ALJ', orden: 2, llegada: '15:09', salida: '15:09' },
                        { codigo: 'FNT', orden: 3, llegada: '15:11', salida: '15:12' },
                        { codigo: 'PST', orden: 4, llegada: '15:14', salida: '15:14' },
                        { codigo: 'MIR', orden: 5, llegada: '15:16', salida: '15:16' },
                        { codigo: 'RCO', orden: 6, llegada: '15:18', salida: '15:18' }
                    ]
                },
                {
                    numero: '103',
                    origen: 'Racó',
                    destino: 'Granja',
                    fecha: new Date(),
                    estado: 'pendiente',
                    tipo: 'Viajeros ordinario',
                    material: '101, 10-3º clase',
                    observaciones: 'Itinerario tarde retorno',
                    estaciones: [
                        { codigo: 'RCO', orden: 1, llegada: '16:00', salida: '16:07' },
                        { codigo: 'MIR', orden: 2, llegada: '16:09', salida: '16:09' },
                        { codigo: 'PST', orden: 3, llegada: '16:11', salida: '16:12' },
                        { codigo: 'FNT', orden: 4, llegada: '16:14', salida: '16:14' },
                        { codigo: 'ALJ', orden: 5, llegada: '16:16', salida: '16:16' },
                        { codigo: 'GRJ', orden: 6, llegada: '16:18', salida: '16:18' }
                    ]
                },
                {
                    numero: '104',
                    origen: 'Taller',
                    destino: 'Mirador',
                    fecha: new Date(),
                    estado: 'pendiente',
                    tipo: 'Mercancías',
                    material: 'M13, 2 plataformas',
                    observaciones: 'Mantenimiento',
                    estaciones: [
                        { codigo: 'TLL', orden: 1, llegada: '17:00', salida: '17:07' },
                        { codigo: 'FNT', orden: 2, llegada: '17:09', salida: '17:09' },
                        { codigo: 'PST', orden: 4, llegada: '17:14', salida: '17:14' },
                        { codigo: 'MIR', orden: 5, llegada: '17:16', salida: '17:16' }
                    ]
                }
            ];

            // Crear cada itinerario y sus estaciones
            for (const itinerarioData of itinerarios) {
                const { estaciones: estacionesData, ...itinerarioInfo } = itinerarioData;
                
                const itinerario = await Itinerario.create(itinerarioInfo);

                for (const { codigo, orden, llegada, salida } of estacionesData) {
                    const estacion = estaciones.find(e => e.codigo === codigo);
                    if (estacion) {
                        await ItinerarioEstacion.create({
                            itinerarioId: itinerario.id,
                            estacionId: estacion.id,
                            orden,
                            horaProgramadaLlegada: llegada,
                            horaProgramadaSalida: salida,
                            observaciones: `Paso en ${estacion.nombre}`
                        });
                    }
                }
            }

            logger.info(logLocation + 'Itinerarios de ejemplo creados correctamente');
        } else {
            logger.info(logLocation + 'Ya existen itinerarios en la base de datos');
        }
    } catch (error) {
        logger.error(logLocation + 'Error en seed de itinerarios: ' + error);
        throw error;
    }
}

// Exportar la función seed
module.exports = seed; 