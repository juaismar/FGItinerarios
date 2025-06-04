const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const verificarToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario) {
      throw new Error();
    }

    req.usuario = usuario;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Por favor autentíquese.' });
  }
};

const verificarRol = (rol) => {
  return async (req, res, next) => {
    if (req.usuario.rol !== rol) {
      return res.status(403).json({ mensaje: 'Acceso denegado. Se requieren privilegios de administrador.' });
    }
    next();
  };
};

const esPlanificador = async (req, res, next) => {
  if (req.usuario.rol !== 'planificador' && req.usuario.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Acceso denegado. Se requieren privilegios de planificador.' });
  }
  next();
};

module.exports = { verificarToken, verificarRol, esPlanificador }; 