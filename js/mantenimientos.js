const esAdministracion = document.body.dataset.pagina === 'administrador';
const usuarioPanel = Sistema.protegerPagina(esAdministracion ? 'Administrador' : null);

if (usuarioPanel) {
    const cuerpoTabla = document.querySelector('#cuerpoSolicitudes');
    const total = document.querySelector('#totalSolicitudes');
    const mensajeVacio = document.querySelector('#sinSolicitudes');

    function agregarCelda(fila, texto) {
        const celda = document.createElement('td');
        celda.textContent = texto;
        fila.append(celda);
        return celda;
    }

    function agregarBoton(contenedor, texto, clase, accion, id) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = `btn btn-sm ${clase}`;
        boton.textContent = texto;
        boton.dataset.accion = accion;
        boton.dataset.id = id;
        contenedor.append(boton);
    }

    function mostrarSolicitudes() {
        cuerpoTabla.replaceChildren();
        const solicitudes = Sistema.listarSolicitudes(esAdministracion);
        total.textContent = solicitudes.length;
        mensajeVacio.hidden = solicitudes.length > 0;

        solicitudes.forEach((solicitud, posicion) => {
            const fila = document.createElement('tr');
            agregarCelda(fila, posicion + 1);
            agregarCelda(fila, solicitud.cliente.nombre);
            agregarCelda(fila, solicitud.vehiculo.placa);
            agregarCelda(fila, solicitud.servicio);
            agregarCelda(fila, `${solicitud.fecha} ${solicitud.hora}`);
            agregarCelda(fila, solicitud.estado || 'Pendiente');
            const acciones = agregarCelda(fila, '');
            const grupo = document.createElement('div');
            grupo.className = 'd-flex flex-wrap gap-2';
            acciones.append(grupo);
            agregarBoton(grupo, 'Ver detalle', 'btn-outline-primary', 'detalle', solicitud.id);

            if (esAdministracion) {
                const enlaceEditar = document.createElement('a');
                enlaceEditar.className = 'btn btn-sm btn-outline-secondary';
                enlaceEditar.textContent = 'Editar';
                enlaceEditar.href = `solicitud.html?editar=${encodeURIComponent(solicitud.id)}`;
                grupo.append(enlaceEditar);
                agregarBoton(grupo, 'Eliminar', 'btn-outline-danger', 'eliminar', solicitud.id);

                const grupoEstado = document.createElement('div');
                grupoEstado.className = 'd-flex gap-2 mt-2';
                const selector = document.createElement('select');
                selector.className = 'form-select form-select-sm';
                selector.setAttribute('aria-label', `Estado de la solicitud de ${solicitud.vehiculo.placa}`);
                Sistema.estados.forEach(estado => selector.add(new Option(estado, estado)));
                selector.value = solicitud.estado || 'Pendiente';
                grupoEstado.append(selector);
                agregarBoton(grupoEstado, 'Guardar estado', 'btn-primary', 'estado', solicitud.id);
                acciones.append(grupoEstado);
            }
            cuerpoTabla.append(fila);
        });
    }

    async function mostrarDetalle(id) {
        const solicitud = Sistema.listarSolicitudes(esAdministracion).find(registro => String(registro.id) === id);
        if (!solicitud) {
            throw new Error('La solicitud ya no existe. Actualiza el listado.');
        }
        const texto = [
            `Identificador: ${solicitud.id}`,
            `Cliente: ${solicitud.cliente.nombre}`,
            `Correo: ${solicitud.cliente.correo}`,
            `Teléfono: ${solicitud.cliente.telefono}`,
            `Vehículo: ${solicitud.vehiculo.marca} ${solicitud.vehiculo.modelo}`,
            `Placa: ${solicitud.vehiculo.placa}`,
            `Año: ${solicitud.vehiculo.anio}`,
            `Kilometraje: ${solicitud.vehiculo.kilometraje}`,
            `Servicio: ${solicitud.servicio}`,
            `Cita: ${solicitud.fecha} ${solicitud.hora}`,
            `Tipo: ${solicitud.tipoMantenimiento}`,
            `Adicionales: ${solicitud.adicionales.join(', ') || 'Ninguno'}`,
            `Observaciones: ${solicitud.observaciones || 'Sin observaciones'}`,
            `Estado: ${solicitud.estado || 'Pendiente'}`
        ].join('\n');
        if (typeof Swal !== 'undefined') {
            await Swal.fire({ title: 'Detalle del mantenimiento', text: texto, customClass: { htmlContainer: 'detalle-solicitud' } });
        } else {
            window.alert(texto);
        }
    }

    cuerpoTabla.addEventListener('click', async evento => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton) {
            return;
        }
        try {
            const id = boton.dataset.id;
            if (boton.dataset.accion === 'detalle') {
                await mostrarDetalle(id);
                return;
            }
            if (boton.dataset.accion === 'estado') {
                const estado = boton.parentElement.querySelector('select').value;
                Sistema.cambiarEstado(id, estado);
                mostrarSolicitudes();
                const mensaje = document.querySelector('#mensajePagina');
                mensaje.textContent = 'Estado actualizado.';
                mensaje.className = 'alert alert-success';
                mensaje.hidden = false;
                return;
            }
            if (boton.dataset.accion === 'eliminar') {
                Sistema.obtenerSolicitud(id);
                let confirmado;
                if (typeof Swal !== 'undefined') {
                    const respuesta = await Swal.fire({
                        icon: 'warning', title: '¿Eliminar esta solicitud?',
                        text: 'La solicitud se eliminará del listado.',
                        showCancelButton: true, confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar', focusCancel: true
                    });
                    confirmado = respuesta.isConfirmed;
                } else {
                    confirmado = window.confirm('¿Eliminar esta solicitud?');
                }
                if (confirmado) {
                    Sistema.eliminarSolicitud(id);
                    mostrarSolicitudes();
                }
            }
        } catch (error) {
            Sistema.mostrarError(error);
        }
    });

    document.querySelector('#actualizarListado').addEventListener('click', () => {
        try {
            mostrarSolicitudes();
        } catch (error) {
            Sistema.mostrarError(error);
        }
    });

    window.addEventListener('storage', evento => {
        if (evento.key === 'autoservice.solicitudes.v1' || evento.key === null) {
            try {
                mostrarSolicitudes();
            } catch (error) {
                Sistema.mostrarError(error);
            }
        }
    });

    try {
        document.querySelector('#perfilNombre').textContent = usuarioPanel.nombre;
        document.querySelector('#perfilCorreo').textContent = usuarioPanel.correo;
        document.querySelector('#perfilTelefono').textContent = usuarioPanel.telefono;
        document.querySelector('#perfilRol').textContent = usuarioPanel.rol;
        mostrarSolicitudes();
        document.querySelector('#contenidoPrivado').hidden = false;
    } catch (error) {
        Sistema.mostrarError(error);
    }
}
