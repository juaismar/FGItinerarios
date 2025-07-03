// Sistema de internacionalización
let currentLanguage = 'es';
let translations = {};

// Cargar idioma por defecto
async function loadLanguage(lang = 'es') {
    try {
        const response = await fetch(`/lang/${lang}.json`);
        translations = await response.json();
        currentLanguage = lang;
        
        // Guardar preferencia en localStorage
        localStorage.setItem('language', lang);
        
        // Aplicar traducciones
        applyTranslations();
        
        return true;
    } catch (error) {
        console.error('Error cargando idioma:', error);
        return false;
    }
}

// Función para obtener traducción
function t(key) {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            return key; // Devolver la clave si no se encuentra la traducción
        }
    }
    
    return value;
}

// Aplicar traducciones a la página actual
function applyTranslations() {
    // Traducir elementos con atributo data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        if (translation !== key) {
            element.textContent = translation;
        }
    });
    
    // Traducir placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = t(key);
        if (translation !== key) {
            element.placeholder = translation;
        }
    });
    
    // Traducir títulos
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        const translation = t(key);
        if (translation !== key) {
            element.title = translation;
        }
    });
}

// Cambiar idioma
async function changeLanguage(lang) {
    const success = await loadLanguage(lang);
    if (success) {
        applyTranslations();
        //TODO test this
        // Recargar la página actual si es necesario
        /*if (typeof cambiarPagina === 'function') {
            const currentPage = getCurrentPage();
            if (currentPage) {
                cambiarPagina(currentPage);
            }
        }*/
    }
}

// Obtener página actual
function getCurrentPage() {
    const activeLink = document.querySelector('.nav-link.active');
    return activeLink ? activeLink.getAttribute('data-page') : 'dashboard';
}

// Inicializar sistema de idiomas
async function initI18n() {
    // Cargar idioma guardado o usar español por defecto
    const savedLanguage = localStorage.getItem('language') || 'es';
    await loadLanguage(savedLanguage);
}

