require('dotenv').config();
const { sequelize } = require('./database');
const Usuario = require('../models/Usuario');
const Estacion = require('../models/Estacion');
const Itinerario = require('../models/Itinerario');
const ItinerarioEstacion = require('../models/ItinerarioEstacion');
const logger = require('../logger').logger;
const { ROLES } = require('../config/roles');

const logLocation = 'seed.js: ';

async function seed() {
    // Sincronizar la base de datos
    await sequelize.sync({ alter: true });
    logger.info(logLocation + 'Base de datos sincronizada');

    await seedUsers();
    await seedEstaciones();
    //await seedItinerarios();
    
    logger.info(logLocation + 'Seed completado exitosamente');
}

async function seedEstaciones() {
    try {
        const estacionesExistentes = await Estacion.count();
        
        if (estacionesExistentes === 0) {
            const estaciones = [
                {
                    id: 1,
                    nombre: 'Granja',
                    codigo: 'G',
                    ubicacion: '-',
                    activa: true,
                    gestionado: true
                },
                {
                    id: 2,
                    nombre: 'Aljibe',
                    codigo: 'A',
                    ubicacion: '-',
                    activa: true,
                    gestionado: false
                },
                {
                    id: 3,
                    nombre: 'Font',
                    codigo: 'F',
                    ubicacion: '-',
                    activa: true,
                    gestionado: false
                },
                {
                    id: 4,
                    nombre: 'Pista',
                    codigo: 'P',
                    ubicacion: '-',
                    activa: true,
                    gestionado: false
                },
                {
                    id: 5,
                    nombre: 'Mirador',
                    codigo: 'M',
                    ubicacion: '-',
                    activa: true
                },
                {
                    id: 6,
                    nombre: 'Racó',
                    codigo: 'R',
                    ubicacion: '-',
                    activa: true,
                    gestionado: true
                },
                {
                    id: 7,
                    nombre: 'Taller',
                    codigo: 'T',
                    ubicacion: '-',
                    activa: true,
                    gestionado: false
                }
            ];

            await Estacion.bulkCreate(estaciones);
            logger.info(logLocation + 'Estaciones iniciales creadas');
        }
    } catch (error) {
        logger.error(logLocation + 'Error en seed: ' + error);
        throw error;
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
        }

        const planificadorExists = await Usuario.findOne({
            where: {
                email: 'planificador@fgitinerarios.com'
            }
        });

        if (!planificadorExists) {
            // Crear usuario admin por defecto
            await Usuario.create({
                nombre: 'Planificador',
                email: 'planificador@fgitinerarios.com',
                password: 'Planificador123!',
                rol: ROLES.PLANIFICADOR,
                activo: true
            });
            logger.info(logLocation + 'Usuario planificador creado correctamente');
        }
    } catch (error) {
        logger.error(logLocation + 'Error en seed: ' + error);
        throw error;
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
                    fecha: '10:00',
                    tipo: 'PASAJEROS',
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
                    fecha: '10:05',
                    tipo: 'PASAJEROS',
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
                    fecha: '15:00',
                    tipo: 'PASAJEROS',
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
                    fecha: '16:00',
                    tipo: 'PASAJEROS',
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
                    fecha: '17:00',
                    tipo: 'OTRO',
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
        }
    } catch (error) {
        logger.error(logLocation + 'Error en seed de itinerarios: ' + error);
        throw error;
    }
}

module.exports = seed; 