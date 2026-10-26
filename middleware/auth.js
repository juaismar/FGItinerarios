const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const logger = require('../logger').logger;

const logLocation = 'auth.js: ';

const verificarAuth = (rolesPermitidos = null) => {
    return async (req, res, next) => {
        try {
          
            // Verificar token
            const token = req.header('Authorization')?.replace('Bearer ', '');

            if (!token) {
                logger.warn(`${logLocation}Petición sin token: ${req.method} ${req.originalUrl}`);
                return res.status(401).json({ mensaje: 'Por favor autentíquese.' });
            }
            
            // Decodificar token y obtener usuario
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const usuario = await Usuario.findByPk(decoded.id);

            if (!usuario) {
                logger.warn(`${logLocation}Token sin usuario: ${req.method} ${req.originalUrl}`);
                return res.status(401).json({ mensaje: 'Usuario no encontrado.' });
            }

            
            // Verificar rol si se requiere
            if (rolesPermitidos) {
                // Convertir a array si es un solo rol
                const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
                
                if (!roles.includes(usuario.rol)) {
                    logger.warn(`${logLocation}${usuario.email} (${usuario.rol}) no puede ${req.method} ${req.originalUrl}`);
                    return res.status(403).json({ 
                        mensaje: `Acceso denegado. Se requieren privilegios de ${roles.join(' o ')}.` 
                    });
                }
            }
            
            // Añadir usuario y token a la request
            req.usuario = usuario;
            req.token = token;
            next();
        } catch (error) {
            logger.warn(`${logLocation}Token no válido: ${req.method} ${req.originalUrl}`);
            res.status(401).json({ mensaje: 'Por favor autentíquese.' });
        }
    };
};


module.exports = { 
    verificarAuth
}; 