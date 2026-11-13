const formularioLogin = document.querySelector('#formularioLogin');
const mensajeLogin = document.querySelector('#mensajePagina');
const motivoLogin = new URLSearchParams(location.search).get('motivo');

if (motivoLogin === 'denegado') {
    mensajeLogin.textContent = 'Acceso denegado. La Administración requiere el rol Administrador.';
    mensajeLogin.className = 'alert alert-danger';
    mensajeLogin.hidden = false;
} else if (motivoLogin === 'deshabilitado') {
    mensajeLogin.textContent = 'Tu cuenta fue deshabilitada por el administrador.';
    mensajeLogin.className = 'alert alert-warning';
    mensajeLogin.hidden = false;
} else if (motivoLogin === 'sesion') {
    mensajeLogin.textContent = 'Inicia sesión para acceder a tus mantenimientos.';
    mensajeLogin.className = 'alert alert-info';
    mensajeLogin.hidden = false;
}

formularioLogin.addEventListener('submit', evento => {
    evento.preventDefault();
    formularioLogin.elements.correo.value = formularioLogin.elements.correo.value.trim();
    if (!formularioLogin.reportValidity()) {
        return;
    }
    try {
        const usuario = Sistema.iniciarSesion(formularioLogin.elements.correo.value, formularioLogin.elements.clave.value);
        const continuar = new URLSearchParams(location.search).get('continuar');
        const destino = continuar?.startsWith('solicitud.html?')
            ? continuar
            : usuario.rol === 'Administrador' ? 'administrador.html' : 'cliente.html';
        location.replace(destino);
    } catch (error) {
        Sistema.mostrarError(error);
    }
});
