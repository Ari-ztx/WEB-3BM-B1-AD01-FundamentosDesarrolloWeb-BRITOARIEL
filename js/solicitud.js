const usuarioSolicitud = Sistema.protegerPagina();

if (usuarioSolicitud) {
    const formulario = document.querySelector('#formularioSolicitud');
    const mensajeFormulario = document.querySelector('#mensajeFormulario');
    const totalSolicitudes = document.querySelector('#totalSolicitudes');
    const campoAnio = document.querySelector('#anio');
    const selectorCliente = document.querySelector('#clienteId');
    const parametrosSolicitud = new URLSearchParams(location.search);
    const idEdicion = parametrosSolicitud.get('editar');
    const servicioSolicitado = parametrosSolicitud.get('servicio');
    let registroAnterior = null;

    function mostrarMensaje(texto, tipo) {
        mensajeFormulario.textContent = texto;
        mensajeFormulario.className = `alert alert-${tipo}`;
        mensajeFormulario.hidden = false;
    }

    function completarCliente() {
        const cuenta = Sistema.cuentasDisponibles(registroAnterior?.clienteId).find(cliente => cliente.id === selectorCliente.value);
        formulario.elements.nombre.value = cuenta.nombre;
        formulario.elements.correo.value = cuenta.correo;
        formulario.elements.telefono.value = cuenta.telefono;
    }

    function llenarFormulario(registro) {
        selectorCliente.value = registro.clienteId || Sistema.cuentasDisponibles(registroAnterior?.clienteId).find(cuenta => cuenta.correo === registro.cliente.correo)?.id || '';
        if (!selectorCliente.value) {
            throw new Error('La cuenta del cliente de esta solicitud no está disponible.');
        }
        completarCliente();
        formulario.elements.telefono.value = registro.cliente.telefono;
        for (const campo of ['placa', 'marca', 'modelo', 'anio', 'kilometraje']) {
            formulario.elements[campo].value = registro.vehiculo[campo];
        }
        for (const campo of ['servicio', 'fecha', 'hora', 'observaciones']) {
            formulario.elements[campo].value = registro[campo] || '';
        }
        const tipo = registro.tipoMantenimiento;
        formulario.querySelectorAll('[name="tipoMantenimiento"]').forEach(campo => campo.checked = campo.value.toLowerCase() === tipo.toLowerCase());
        formulario.querySelectorAll('[name="adicionales"]').forEach(campo => campo.checked = registro.adicionales.includes(campo.value));
    }

    try {
        campoAnio.max = new Date().getFullYear();
        document.querySelector('#selectorClienteGrupo').hidden = usuarioSolicitud.rol !== 'Administrador';
        if (idEdicion !== null) {
            registroAnterior = Sistema.obtenerSolicitud(idEdicion);
        }
        Sistema.cuentasDisponibles(registroAnterior?.clienteId).forEach(cuenta => {
            selectorCliente.add(new Option(`${cuenta.nombre} (${cuenta.correo})`, cuenta.id));
        });
        selectorCliente.value = usuarioSolicitud.id;
        completarCliente();
        formulario.elements.nombre.readOnly = true;
        formulario.elements.correo.readOnly = true;
        totalSolicitudes.textContent = Sistema.listarSolicitudes().length;
        if (idEdicion !== null) {
            llenarFormulario(registroAnterior);
            document.querySelector('#tituloSolicitud').textContent = 'Editar solicitud';
            formulario.querySelector('[type="submit"]').textContent = 'Guardar cambios';
        }
        if (idEdicion === null && servicioSolicitado) {
            formulario.elements.servicio.value = servicioSolicitado;
        }
        formulario.hidden = false;
    } catch (error) {
        Sistema.mostrarError(error);
    }

    selectorCliente.addEventListener('change', completarCliente);

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();
        mensajeFormulario.hidden = true;
        for (const campo of ['nombre', 'correo', 'telefono', 'marca', 'modelo']) {
            formulario.elements[campo].value = formulario.elements[campo].value.trim();
        }
        formulario.elements.placa.value = formulario.elements.placa.value.trim().toUpperCase();
        campoAnio.max = new Date().getFullYear();
        if (!formulario.reportValidity()) {
            return;
        }
        const datos = new FormData(formulario);
        try {
            const solicitud = Sistema.guardarSolicitud({
                clienteId: datos.get('clienteId'),
                cliente: {
                    nombre: datos.get('nombre'),
                    correo: datos.get('correo'),
                    telefono: datos.get('telefono')
                },
                vehiculo: {
                    placa: datos.get('placa'),
                    marca: datos.get('marca'),
                    modelo: datos.get('modelo'),
                    anio: Number(datos.get('anio')),
                    kilometraje: Number(datos.get('kilometraje'))
                },
                servicio: datos.get('servicio'),
                fecha: datos.get('fecha'),
                hora: datos.get('hora'),
                tipoMantenimiento: datos.get('tipoMantenimiento'),
                adicionales: datos.getAll('adicionales'),
                observaciones: datos.get('observaciones').trim()
            }, idEdicion);
            totalSolicitudes.textContent = Sistema.listarSolicitudes().length;
            if (idEdicion) {
                registroAnterior = solicitud;
            } else {
                formulario.reset();
            }
            const texto = idEdicion ? 'Los cambios fueron guardados.' : 'La solicitud fue registrada con estado Pendiente.';
            mostrarMensaje(texto, 'success');
            if (typeof Swal !== 'undefined') {
                await Swal.fire({ icon: 'success', title: 'Solicitud guardada', text: texto, confirmButtonText: 'Aceptar' });
            }
            if (idEdicion) {
                location.assign('administrador.html');
            }
        } catch (error) {
            mostrarMensaje(error.message, 'danger');
        }
    });

    formulario.addEventListener('reset', () => {
        mensajeFormulario.hidden = true;
        setTimeout(() => {
            try {
                selectorCliente.value = usuarioSolicitud.id;
                if (registroAnterior) {
                    llenarFormulario(registroAnterior);
                } else {
                    completarCliente();
                }
            } catch (error) {
                Sistema.mostrarError(error);
            }
        }, 0);
    });
}
