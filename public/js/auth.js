// Función para verificar la sesión y redirigir según el rol
function verificarSesion() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Si no hay token y no estamos en visor/index, redirigir a login
        if (!window.location.pathname.includes('home_visor.html') && 
            !window.location.pathname.includes('index.html')) {
            window.location.href = '/index.html';
        }
        return;
    }

    // Verificar el token y obtener el rol del usuario
    fetch('/api/usuarios/perfil', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        return response.json();
    })
    .then(usuario => {
        const rutaActual = window.location.pathname;
        
        // Actualizar nombre de usuario en todas las páginas
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            userInfoElement.textContent = usuario.nombre;
        }

        switch(usuario.rol) {
            case 'admin':
                if (!rutaActual.includes('home_admin.html')) {
                    window.location.href = '/home_admin.html';
                }
                break;
            case 'planificador':
                if (!rutaActual.includes('home_planificador.html')) {
                    window.location.href = '/home_planificador.html';
                }
                break;
            default:
                window.location.href = '/index.html';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = '/index.html';
        }
    });
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}

// Verificar sesión al cargar la página
document.addEventListener('DOMContentLoaded', verificarSesion); 