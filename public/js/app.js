
// Verificar si ya hay una sesión activa
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Verificar si el token es válido
        fetch('/api/usuarios/perfil', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Token inválido');
            }
        })
        .then(usuario => {
            // Redirigir según el rol
            switch(usuario.rol) {
                case 'admin':
                    window.location.href = '/home_admin.html';
                    break;
                case 'planificador':
                    window.location.href = '/home_planificador.html';
                    break;
                case 'visor':
                    window.location.href = '/home_visor.html';
                    break;
                default:
                    window.location.href = '/home_visor.html';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            localStorage.removeItem('token');
        });
    }
}); 