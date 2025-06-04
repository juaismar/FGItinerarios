const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { auth } = require('../middleware/auth');
const logger = require('../logger').logger;

const logLocation = 'usuarios.js: ';

// Registro de usuario
router.post('/registro', async (req, res) => {
  try {
    const usuario = new Usuario(req.body);
    await usuario.save();
    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET);
    res.status(201).json({ usuario, token });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error en el registro' });
  }
});

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
router.get('/perfil', auth, async (req, res) => {
  res.json(req.usuario);
});

module.exports = router; 