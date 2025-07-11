const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { verificarAuth } = require('../middleware/auth');
const logger = require('../logger').logger;
const { ssp } = require('../db/database');

const logLocation = 'usuarios.js: ';
router.use(express.json());

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario || !(await usuario.verificarPassword(password))) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await usuario.update({ ultimoAcceso: new Date() });

    const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET);

    res.json({ usuario, token });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error en el login' });
  }
});

// Obtener perfil del usuario
router.get('/perfil', verificarAuth(), async (req, res) => {
  res.json(req.usuario);
});

// Obtener usuarios paginados (solo admin)
router.get('/paginated', verificarAuth('admin'), async (req, res) => {
    try {
        const columns = [
            { db: 'id', dt: 'id', formatter: null },
            { db: 'nombre', dt: 'nombre', formatter: null },
            { db: 'email', dt: 'email', formatter: null },
            { db: 'rol', dt: 'rol', formatter: null },
            { db: 'activo', dt: 'activo', formatter: null },
            { db: 'ultimoAcceso', dt: 'ultimoAcceso', formatter: null }
        ];

      const result = await ssp.Simple(req.query, 'Usuarios', columns);

      res.json(result);
    } catch (error) {
        logger.error(logLocation + 'Error al obtener usuarios paginados:', error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }
});

//Crear un nuevo usuario (solo admin)
router.post('/', verificarAuth('admin'), async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const usuario = await Usuario.create({ nombre, email, password, rol });
    logger.info(logLocation + 'Usuario creado exitosamente:', usuario);
    res.status(201).json(usuario);
  } catch (error) {
    logger.error(logLocation + 'Error al crear usuario:', error);
    res.status(500).json({ mensaje: 'Error al crear usuario' });
  }
});

// Actualizar usuario (solo admin)
router.put('/:id', verificarAuth('admin'), async (req, res) => {
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
router.delete('/:id', verificarAuth('admin'), async (req, res) => {
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