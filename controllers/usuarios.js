const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { verificarToken, verificarRol } = require('../middleware/auth');
const logger = require('../logger').logger;

const logLocation = 'usuarios.js: ';

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario || !(await usuario.verificarPassword(password))) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET);

    res.json({ usuario, token });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error en el login' });
  }
});

// Obtener perfil del usuario
router.get('/perfil', verificarToken, async (req, res) => {
  res.json(req.usuario);
});

// Obtener todos los usuarios (solo admin)
router.get('/', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'email', 'rol', 'activo', 'ultimoAcceso']
    });
    res.json(usuarios);
  } catch (error) {
    logger.error(logLocation + 'Error al obtener usuarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
});

// Actualizar usuario (solo admin)
router.put('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo } = req.body;
    
    await Usuario.update(
      { nombre, email, rol, activo },
      { where: { id } }
    );
    
    res.status(204).send();
  } catch (error) {
    logger.error(logLocation + 'Error al actualizar usuario:', error);
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario (solo admin)
router.delete('/:id', verificarToken, verificarRol('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await Usuario.destroy({ where: { id } });
    res.status(204).send();
  } catch (error) {
    logger.error(logLocation + 'Error al eliminar usuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
});

module.exports = router; 