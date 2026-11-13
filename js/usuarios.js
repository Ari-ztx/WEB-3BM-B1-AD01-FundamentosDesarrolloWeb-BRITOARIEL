if (document.body.dataset.pagina === 'administrador' && Sistema.obtenerUsuario()?.rol === 'Administrador'
        && document.querySelector('#cuerpoUsuarios')) {
    const cuerpoUsuarios = document.querySelector('#cuerpoUsuarios');
    const mensajeUsuarios = document.querySelector('#mensajeUsuarios');

    function mostrarUsuarios() {
        const cuentas = Sistema.listarUsuarios();
        const administrador = Sistema.obtenerUsuario();
        cuerpoUsuarios.replaceChildren();

        cuentas.forEach(cuenta => {
            const fila = document.createElement('tr');
            fila.dataset.usuarioId = cuenta.id;
            for (const texto of [cuenta.nombre, cuenta.correo, cuenta.rol, cuenta.activo ? 'Habilitado' : 'Deshabilitado']) {
                const celda = document.createElement('td');
                celda.textContent = texto;
                fila.append(celda);
            }
            const acciones = document.createElement('td');
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = cuenta.activo ? 'btn btn-sm btn-outline-danger' : 'btn btn-sm btn-outline-success';
            boton.textContent = cuenta.activo ? 'Deshabilitar' : 'Habilitar';
            boton.dataset.id = cuenta.id;
            boton.dataset.activo = String(!cuenta.activo);
            boton.disabled = cuenta.id === administrador.id;
            if (boton.disabled) {
                boton.title = 'Cuenta de la sesión actual';
            }
            acciones.append(boton);
            fila.append(acciones);
            cuerpoUsuarios.append(fila);
        });
    }

    cuerpoUsuarios.addEventListener('click', async evento => {
        const boton = evento.target.closest('button[data-id]');
        if (!boton || boton.disabled) {
            return;
        }
        try {
            const id = boton.dataset.id;
            const activo = boton.dataset.activo === 'true';
            const cuenta = Sistema.listarUsuarios().find(usuario => usuario.id === id);
            if (!cuenta) {
                throw new Error('La cuenta seleccionada no existe.');
            }
            const accion = activo ? 'Habilitar' : 'Deshabilitar';
            let confirmado;
            if (typeof Swal !== 'undefined') {
                const respuesta = await Swal.fire({
                    icon: 'question',
                    title: `¿${accion} a ${cuenta.nombre}?`,
                    text: activo ? 'La cuenta podrá iniciar sesión.' : 'La cuenta perderá el acceso al sistema.',
                    showCancelButton: true,
                    confirmButtonText: accion,
                    cancelButtonText: 'Cancelar',
                    focusCancel: true
                });
                confirmado = respuesta.isConfirmed;
            } else {
                confirmado = window.confirm(`¿${accion} a ${cuenta.nombre}?`);
            }
            if (confirmado) {
                Sistema.cambiarEstadoUsuario(id, activo);
                mostrarUsuarios();
                mensajeUsuarios.textContent = `${cuenta.nombre}: cuenta ${activo ? 'habilitada' : 'deshabilitada'}.`;
                mensajeUsuarios.className = 'alert alert-success';
                mensajeUsuarios.hidden = false;
            }
        } catch (error) {
            Sistema.mostrarError(error);
        }
    });

    window.addEventListener('storage', evento => {
        if (evento.key === 'autoservice.estadosUsuarios.v1' || evento.key === null) {
            try {
                mostrarUsuarios();
            } catch (error) {
                Sistema.mostrarError(error);
            }
        }
    });

    try {
        mostrarUsuarios();
    } catch (error) {
        Sistema.mostrarError(error);
    }
}
