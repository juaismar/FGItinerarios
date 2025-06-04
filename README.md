# FGItinerarios

Aplicación web para la gestión de itinerarios.

## Requisitos Previos

- Node.js (versión recomendada: 14.x o superior)
- npm (incluido con Node.js)

## Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd FGItinerarios
```

2. Instala las dependencias:
```bash
npm install
```

## Estructura del Proyecto

```
FGItinerarios/
├── config/         # Configuraciones de la aplicación
├── middleware/     # Middleware de Express
├── models/         # Modelos de datos
├── routes/         # Rutas de la API
├── database.js     # Configuración de la base de datos
├── logger.js       # Configuración del sistema de logs
└── server.js       # Punto de entrada de la aplicación
```

## Desarrollo

Para iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

## Producción

Para iniciar el servidor en modo producción:

```bash
npm start
```

## Licencia

Este proyecto está bajo la Licencia MIT. 