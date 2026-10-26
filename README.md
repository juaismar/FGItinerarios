# FGItinerarios

Aplicación web para planificar y seguir la circulación de trenes. Un mismo servidor Express entrega la interfaz (`public/`) y la API JSON (`/api`).

## Itinerario y circulación

Son dos cosas distintas:

- **Itinerario.** Plantilla de un tren: número, origen, destino y horas de reloj, sin día de calendario. El número es único.
- **Circulación.** Ese itinerario aplicado a una fecha concreta. Tiene estado (`PENDIENTE`, `EN_PROGRESO`, `COMPLETADO`, `CANCELADO`) y, en cada estación, vía y horas reales. El mismo número puede circular varios días; la pareja número + fecha es única.

El planificador elige itinerarios del catálogo y, para un día, la aplicación crea las circulaciones. La malla dibuja esas circulaciones.

## Gestión de la estación

Cada estación activa tiene uno de estos modos:

- **Sin gestión.** No aparece en el control de estación y no retiene al tren. Si pasa un minuto de la hora programada sin marca, el visor la muestra retrasada.
- **Gestión manual.** Aparece en el control. La siguiente estación manual no muestra el tren hasta que aquí se registra la salida.
- **Gestión automática.** Al llegar la hora programada, el servidor anota la llegada y la salida con esa misma hora. No aparece en el control y no retiene a la siguiente estación manual. El visor la muestra en hora.

Una estación inactiva queda en sin gestión.

En el recorrido de ejemplo, Granja y Racó son manuales, Aljibe, Font, Pista y Mirador son automáticas, y Taller está sin gestión. Si la salida automática es la del origen, la circulación pasa a en progreso. Completado sigue dependiendo de quien cierra la última parada.

## Idioma

El texto visible está en `public/i18n/`: `es-ES.json` (español, el idioma por defecto), `ca-ES-valencia.json` (valenciano) y `en.json` (inglés). El HTML sigue en español y sirve de respaldo. El selector guarda la elección en `localStorage` (`idioma`) y recarga la página. Las tablas usan el mismo código en `public/datatable_lang/`.

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
LOG_LEVEL=info
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

## Logs

Winston (`logger.js`) escribe en la consola del proceso. No hay fichero de log. El nivel por defecto es `info`; `LOG_LEVEL` lo cambia (`error`, `warn`, `info`, `debug`).

| Nivel | Cuándo |
| --- | --- |
| error | Fallo al atender una petición, al arrancar o al cerrar |
| warn | Login rechazado, token ausente o no válido, rol insuficiente, ruta no encontrada |
| info | Arranque, cierre, seed, migraciones y cambios del servicio: circulaciones creadas, gestión de una estación, marcado automático |
| debug | Cada petición HTTP. Con `info` no se muestra |

El hash de la contraseña no se escribe en el log.

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