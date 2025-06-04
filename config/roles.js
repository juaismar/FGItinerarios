const ROLES = {
    ADMIN: 'admin',
    PLANIFICADOR: 'planificador',
    VISOR: 'visor'
};

const ROLES_DESCRIPCION = {
    [ROLES.ADMIN]: 'Administrador del sistema',
    [ROLES.PLANIFICADOR]: 'Planificador de itinerarios',
    [ROLES.VISOR]: 'Visor de itinerarios'
};

const ROLES_PERMISOS = {
    [ROLES.ADMIN]: [
        'crear_usuario',
        'editar_usuario',
        'eliminar_usuario',
        'ver_usuarios',
        'crear_itinerario',
        'editar_itinerario',
        'eliminar_itinerario',
        'ver_itinerarios'
    ],
    [ROLES.PLANIFICADOR]: [
        'crear_itinerario',
        'editar_itinerario',
        'eliminar_itinerario',
        'ver_itinerarios'
    ],
    [ROLES.VISOR]: [
        'ver_itinerarios'
    ]
};

module.exports = {
    ROLES,
    ROLES_DESCRIPCION,
    ROLES_PERMISOS
}; 