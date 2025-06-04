// Funciones para mostrar/ocultar el formulario de login
function mostrarLogin() {
    document.getElementById('loginForm').style.display = 'block';
}

function ocultarLogin() {
    document.getElementById('loginForm').style.display = 'none';
}

// Función para manejar el login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/usuarios/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Guardar el token
            localStorage.setItem('token', data.token);
            
            // Redirigir según el rol
            switch(data.usuario.rol) {
                case 'admin':
                    window.location.href = '/admin.html';
                    break;
                case 'planificador':
                    window.location.href = '/planificador.html';
                    break;
                case 'visor':
                    window.location.href = '/visor.html';
                    break;
                default:
                    window.location.href = '/control.html';
            }
        } else {
            alert(data.mensaje || 'Error en el login');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
    }
}

// Función para acceder como visor
function accederComoVisor() {
    // Redirigir a la vista de visor
    window.location.href = '/visor.html';
}

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
                    window.location.href = '/admin.html';
                    break;
                case 'planificador':
                    window.location.href = '/planificador.html';
                    break;
                case 'visor':
                    window.location.href = '/visor.html';
                    break;
                default:
                    window.location.href = '/control.html';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            localStorage.removeItem('token');
        });
    }
}); 