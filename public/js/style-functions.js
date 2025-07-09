// Función para mostrar loading en botones
function mostrarLoading(boton, textoOriginal) {
    boton.prop('disabled', true);
    boton.html(`<i class="fas fa-spinner fa-spin"></i> ${textoOriginal}...`);
}

// Función para restaurar botón después del loading
function restaurarBoton(boton, textoOriginal) {
    boton.prop('disabled', false);
    boton.html(textoOriginal);
}