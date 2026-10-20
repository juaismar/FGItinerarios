# FGItinerarios

Aplicación web para planificar y seguir la circulación de trenes. Un mismo servidor Express entrega la interfaz (`public/`) y la API JSON (`/api`).

## Itinerario y circulación

Son dos cosas distintas:

- **Itinerario.** Plantilla de un tren: número, origen, destino y horas de reloj, sin día de calendario. El número es único.
- **Circulación.** Ese itinerario aplicado a una fecha concreta. Tiene estado (`PENDIENTE`, `EN_PROGRESO`, `COMPLETADO`, `CANCELADO`) y, en cada estación, vía y horas reales. El mismo número puede circular varios días; la pareja número + fecha es única.

El planificador elige itinerarios del catálogo y, para un día, la aplicación crea las circulaciones. La malla dibuja esas circulaciones.

## Quién entra

| Acceso | Qué hace |
| --- | --- |
| Administrador | Catálogo de itinerarios, estaciones y usuarios |
| Planificador | Circulaciones del día, selección de itinerarios, malla y control de estaciones |
| Visor | Pantalla de llegadas y salidas, sin cuenta |

El acceso con cuenta usa un token JWT en la cabecera `Authorization`.

## Requisitos

- Node.js 18 o superior
- npm
- PostgreSQL

En desarrollo la conexión está fija en `db/database.js`: base `fgtest`, usuario `postgres`, contraseña `postgres`, `localhost:5432`. Hay que crear esa base antes de arrancar; Sequelize crea las tablas, no la base.

## Instalación

```bash
git clone [URL_DEL_REPOSITORIO]
cd FGItinerarios
npm install
```

Crea un archivo `.env` en la raíz. En desarrollo basta con el secreto del token:

```bash
JWT_SECRET=cambia-este-valor
```

## Arranque

```bash
npm run dev
```

La aplicación queda en `http://localhost:3000`. El entorno lo marca `FGItinerarios_ENV` (`development` si no se indica). En desarrollo, al arrancar se ejecuta el seed: crea estaciones y, si no existen, estos usuarios:

| Email | Contraseña | Rol |
| --- | --- | --- |
| admin@fgitinerarios.com | Admin123! | admin |
| planificador@fgitinerarios.com | Planificador123! | planificador |

`npm start` arranca igual. `npm run prod` solo cambia `NODE_ENV`; la configuración de base de datos sigue dependiendo de `FGItinerarios_ENV`.

## Producción

Define `FGItinerarios_ENV=production` y estas variables:

```bash
JWT_SECRET=
PORT=3000
CORS_ORIGIN=https://tu-dominio
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_HOST=
DB_PORT=5432
```

## Estructura

```
FGItinerarios/
├── config/          # Roles
├── controllers/     # Rutas de la API
├── db/              # Conexión, sincronización y seed
├── middleware/      # Autenticación
├── models/          # Itinerario, Circulacion, Estacion, Usuario
├── public/          # Interfaz (HTML, CSS y JS)
├── logger.js
├── router.js        # API y ficheros estáticos
└── server.js
```

## API

| Ruta | Recurso |
| --- | --- |
| `/api/itinerarios` | Catálogo de itinerarios |
| `/api/circulaciones` | Circulaciones de un día |
| `/api/estaciones` | Estaciones |
| `/api/usuarios` | Login, perfil y usuarios |
| `/api/panel` | Datos del visor |
| `/api/controlEstacion` | Llegadas y salidas de una estación |

## Licencia

ISC.

TODO HACER AUTO NUMERACION CUANDO SE SELECCIONE UNA CIRCULACION CUSTOM