/**
 * Módulo de Notificaciones Flash
 * Maneja todas las notificaciones y confirmaciones de la aplicación
 */
const FlashNotifications = {
    // Configuración por defecto
    config: {
        autoHide: true,
        duration: 5000,
        animationDuration: 500,
        scrollToTop: true,
        scrollOffset: 20
    },

    // Mapeo de tipos de notificación
    types: {
        success: {
            class: 'success',
            icon: 'fas fa-check-circle'
        },
        error: {
            class: 'danger',
            icon: 'fas fa-exclamation-triangle'
        },
        warning: {
            class: 'warning',
            icon: 'fas fa-exclamation-triangle'
        },
        info: {
            class: 'info',
            icon: 'fas fa-info-circle'
        }
    },

    /**
     * Muestra una notificación flash
     * @param {string} titulo - Título de la notificación
     * @param {string} mensaje - Mensaje de la notificación
     * @param {string} tipo - Tipo de notificación (success, error, warning, info)
     * @param {Object} options - Opciones adicionales
     */
    show: function(titulo, mensaje, tipo = 'info', options = {}) {
        const config = { ...this.config, ...options };
        const typeConfig = this.types[tipo] || this.types.info;
        
        // Crear la alerta HTML
        const alerta = this._createAlertHTML(titulo, mensaje, typeConfig);
        
        // Insertar en el DOM
        this._insertAlert(alerta);
        
        // Configurar auto-ocultado
        if (config.autoHide) {
            this._setupAutoHide(alerta, config.duration, config.animationDuration);
        }
        
        // Scroll hacia arriba si está habilitado
        if (config.scrollToTop) {
            this._scrollToTop(config.scrollOffset);
        }
        
        return alerta;
    },

    /**
     * Muestra una notificación de éxito
     */
    success: function(titulo, mensaje, options = {}) {
        return this.show(titulo, mensaje, 'success', options);
    },

    /**
     * Muestra una notificación de error
     */
    error: function(titulo, mensaje, options = {}) {
        return this.show(titulo, mensaje, 'error', options);
    },

    /**
     * Muestra una notificación de advertencia
     */
    warning: function(titulo, mensaje, options = {}) {
        return this.show(titulo, mensaje, 'warning', options);
    },

    /**
     * Muestra una notificación informativa
     */
    info: function(titulo, mensaje, options = {}) {
        return this.show(titulo, mensaje, 'info', options);
    },

    /**
     * Muestra un modal de confirmación
     * @param {string} mensaje - Mensaje de confirmación
     * @param {Object} options - Opciones del modal
     * @returns {Promise<boolean>} - Promise que resuelve a true si se confirma
     */
    confirm: function(mensaje, options = {}) {
        // Obtener traducciones si están disponibles
        const t = window.t || function(key) { return key; };
        
        const defaultOptions = {
            title: t('common.confirm_action') || 'Confirmar Acción',
            confirmText: t('common.yes_confirm') || 'Sí, confirmar',
            cancelText: t('common.cancel') || 'Cancelar',
            confirmClass: 'btn-danger',
            icon: 'fas fa-exclamation-triangle'
        };
        
        const config = { ...defaultOptions, ...options };
        
        return new Promise((resolve) => {
            const modal = this._createConfirmModal(mensaje, config);
            
            // Agregar al DOM
            $('body').append(modal);
            
            // Crear instancia de Bootstrap Modal
            const bootstrapModal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
            
            // Manejar eventos
            this._setupConfirmModalEvents(bootstrapModal, resolve);
            
            // Mostrar modal
            bootstrapModal.show();
        });
    },

    /**
     * Oculta una notificación específica
     */
    hide: function(alerta) {
        if (alerta && alerta.length) {
            alerta.fadeOut(this.config.animationDuration, function() {
                $(this).remove();
            });
        }
    },

    /**
     * Oculta todas las notificaciones
     */
    hideAll: function() {
        $('.alert').fadeOut(this.config.animationDuration, function() {
            $(this).remove();
        });
    },

    // Métodos privados

    /**
     * Crea el HTML de la alerta
     */
    _createAlertHTML: function(titulo, mensaje, typeConfig) {
        return $(`
            <div class="alert alert-${typeConfig.class} fade show" role="alert">
                <h5 class="alert-heading">
                    <i class="${typeConfig.icon}"></i> ${titulo}
                </h5>
                <p class="mb-0">${mensaje}</p>
            </div>
        `);
    },

    /**
     * Inserta la alerta en el DOM
     */
    _insertAlert: function(alerta) {
        // Buscar el contenedor principal
        const container = $('#main-content, .content').first();
        if (container.length) {
            container.prepend(alerta);
        } else {
            // Fallback al body
            $('body').prepend(alerta);
        }
    },

    /**
     * Configura el auto-ocultado de la alerta
     */
    _setupAutoHide: function(alerta, duration, animationDuration) {
        setTimeout(() => {
            this.hide(alerta);
        }, duration);
    },

    /**
     * Hace scroll hacia arriba para mostrar la alerta
     */
    _scrollToTop: function(offset) {
        const container = $('#main-content, .content').first();
        if (container.length) {
            $('html, body').animate({
                scrollTop: container.offset().top - offset
            }, 300);
        }
    },

    /**
     * Crea el HTML del modal de confirmación
     */
    _createConfirmModal: function(mensaje, config) {
        return $(`
            <div class="modal fade" id="modalConfirmacion" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">
                                <i class="${config.icon}"></i> ${config.title}
                            </h5>
                            <button type="button" class="btn-close-custom" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>${mensaje}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i> ${config.cancelText}
                            </button>
                            <button type="button" class="btn ${config.confirmClass}" id="btnConfirmarAccion">
                                <i class="fas fa-check"></i> ${config.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    },

    /**
     * Configura los eventos del modal de confirmación
     */
    _setupConfirmModalEvents: function(bootstrapModal, resolve) {
        // Manejar confirmación
        $('#btnConfirmarAccion').on('click', function() {
            bootstrapModal.hide();
            resolve(true);
        });
        
        // Manejar cancelación
        $('#modalConfirmacion').on('hidden.bs.modal', function() {
            resolve(false);
            $(this).remove();
        });
    }
};

// Exportar para uso global
window.FlashNotifications = FlashNotifications; 