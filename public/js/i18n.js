(function () {
    const IDIOMAS = ['es-ES', 'ca-ES-valencia', 'en'];
    const guardado = localStorage.getItem('idioma');
    const idioma = IDIOMAS.indexOf(guardado) >= 0 ? guardado : 'es-ES';
    let diccionario = {};

    function leer(objeto, clave) {
        return clave.split('.').reduce(function (actual, parte) {
            if (!actual || typeof actual !== 'object') {
                return undefined;
            }
            return actual[parte];
        }, objeto);
    }

    function t(clave, vars) {
        const valor = leer(diccionario, clave);
        if (typeof valor !== 'string') {
            return '';
        }
        if (!vars) {
            return valor;
        }
        return valor.replace(/\{(\w+)\}/g, function (_, nombre) {
            return vars[nombre] == null ? '' : String(vars[nombre]);
        });
    }

    function texto(clave, respaldo, vars) {
        return t(clave, vars) || respaldo || '';
    }

    function aplicarIdioma(raiz) {
        const base = raiz && raiz.querySelectorAll ? raiz : document;
        base.querySelectorAll('[data-i18n]').forEach(function (el) {
            const valor = t(el.getAttribute('data-i18n'));
            if (valor) {
                el.textContent = valor;
            }
        });
        base.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            const valor = t(el.getAttribute('data-i18n-title'));
            if (valor) {
                el.setAttribute('title', valor);
            }
        });
        base.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            const valor = t(el.getAttribute('data-i18n-placeholder'));
            if (valor) {
                el.setAttribute('placeholder', valor);
            }
        });
    }

    function urlIdiomaTabla() {
        return '/datatable_lang/' + idioma + '.json';
    }

    function mensajeApi(datos, respaldo) {
        if (datos && datos.codigo) {
            const valor = t('api.' + datos.codigo, datos);
            if (valor) {
                return valor;
            }
        }
        if (datos && datos.mensaje) {
            return datos.mensaje;
        }
        return respaldo || '';
    }

    function textoRetraso(minutos) {
        const total = Number(minutos) || 0;
        if (total < 60) {
            return texto('visor.retrasoMinutos', 'Retraso ' + total + ' min', { minutos: total });
        }
        const horas = Math.floor(total / 60);
        const resto = total % 60;
        if (resto === 0) {
            return texto('visor.retrasoHoras', 'Retraso ' + horas + ' h', { horas: horas });
        }
        return texto('visor.retrasoHorasMinutos', 'Retraso ' + horas + ' h ' + resto + ' min', {
            horas: horas,
            minutos: resto
        });
    }

    function textoSituacion(fila) {
        if (!fila) {
            return '';
        }
        if (fila.codigo === 'CANCELADO' || fila.cancelado) {
            return texto('visor.cancelado', 'Cancelado');
        }
        if (fila.codigo === 'RETRASO') {
            return textoRetraso(fila.minutos);
        }
        return fila.observaciones || '';
    }

    function htmlEstado(estado) {
        const colores = {
            PENDIENTE: 'warning',
            EN_PROGRESO: 'info',
            COMPLETADO: 'success',
            CANCELADO: 'danger'
        };
        const etiqueta = texto('estado.' + estado, estado || '');
        return '<span class="badge bg-' + (colores[estado] || 'secondary') + '">' + etiqueta + '</span>';
    }

    function prepararSelector() {
        const select = document.getElementById('selectorIdioma');
        if (!select || select.dataset.idiomaListo === '1') {
            return;
        }
        select.dataset.idiomaListo = '1';
        select.value = idioma;
        select.addEventListener('change', function () {
            if (IDIOMAS.indexOf(select.value) < 0) {
                return;
            }
            localStorage.setItem('idioma', select.value);
            location.reload();
        });
    }

    const idiomaHtml = {
        'es-ES': 'es',
        'ca-ES-valencia': 'ca-ES-valencia',
        'en': 'en'
    };
    document.documentElement.lang = idiomaHtml[idioma] || 'es';

    window.t = t;
    window.texto = texto;
    window.aplicarIdioma = aplicarIdioma;
    window.urlIdiomaTabla = urlIdiomaTabla;
    window.mensajeApi = mensajeApi;
    window.textoSituacion = textoSituacion;
    window.htmlEstado = htmlEstado;
    window.idiomaActual = function () {
        return idioma;
    };

    window.idiomaListo = fetch('/i18n/' + idioma + '.json')
        .then(function (respuesta) {
            if (!respuesta.ok) {
                throw new Error('idioma');
            }
            return respuesta.json();
        })
        .then(function (datos) {
            diccionario = datos || {};
            aplicarIdioma(document);
            prepararSelector();
        })
        .catch(function () {
            prepararSelector();
        });
})();
