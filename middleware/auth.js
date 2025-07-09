const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const verificarAuth = (rolesPermitidos = null) => {
    return async (req, res, next) => {
        try {
          console.log("verificarAuth");
          
            // Verificar token
            const token = req.header('Authorization')?.replace('Bearer ', '');
            console.log("token");
            console.log(token);
            if (!token) {
                return res.status(401).json({ mensaje: 'Por favor autentíquese.' });
            }
            console.log("token");
            
            // Decodificar token y obtener usuario
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const usuario = await Usuario.findByPk(decoded.id);

            if (!usuario) {
                return res.status(401).json({ mensaje: 'Usuario no encontrado.' });
            }

            
            // Verificar rol si se requiere
            if (rolesPermitidos) {
                // Convertir a array si es un solo rol
                const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
                
                if (!roles.includes(usuario.rol)) {
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
            res.status(401).json({ mensaje: 'Por favor autentíquese.' });
        }
    };
};


module.exports = { 
    verificarAuth
}; 