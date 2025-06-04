const express = require('express');
const router = express.Router();
const logger = require('./logger').logger;
const path = require('path');

const logLocation = 'router.js: ';

// Importar controladores
const itinerariosRoutes = require('./controllers/itinerarios');
const usuariosRoutes = require('./controllers/usuarios');

// Servir archivos estáticos desde la carpeta public
router.use(express.static(path.join(__dirname, 'public')));

// Definir rutas API
router.use('/itinerarios', itinerariosRoutes);
router.use('/usuarios', usuariosRoutes);

// Ruta para servir el index.html
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = router;
