const Sistema = (() => {
    const claveSolicitudes = 'autoservice.solicitudes.v1';
    const claveSesion = 'autoservice.usuario';
    const claveEstadosUsuarios = 'autoservice.estadosUsuarios.v1';
    const usuarios = [
        { id: 'admin', nombre: 'Administrador AutoService', correo: 'admin@autoservice.test', telefono: '0990000001', clave: 'Admin123', rol: 'Administrador', activo: true },
        { id: 'cliente1', nombre: 'Ana Torres', correo: 'ana@autoservice.test', telefono: '0990000002', clave: 'Cliente123', rol: 'Cliente', activo: true },
        { id: 'cliente2', nombre: 'Luis Pérez', correo: 'luis@autoservice.test', telefono: '0990000003', clave: 'Cliente123', rol: 'Cliente', activo: true },
        { id: 'deshabilitado', nombre: 'Cuenta deshabilitada', correo: 'inactivo@autoservice.test', telefono: '0990000004', clave: 'Cliente123', rol: 'Cliente', activo: false }
    ];
    const estados = ['Pendiente', 'En revisión', 'En proceso', 'Finalizado', 'Cancelado'];
    const servicios = ['Cambio de aceite', 'Sistema de frenos', 'Mecánica general', 'Sistema eléctrico', 'Diagnóstico electrónico', 'Suspensión'];
    const adicionales = ['Revisión de luces', 'Revisión de neumáticos'];

    function leerEstadosUsuarios() {
        const contenido = localStorage.getItem(claveEstadosUsuarios);
        if (contenido === null) {
            return {};
        }
        const estadosUsuarios = JSON.parse(contenido);
        if (!estadosUsuarios || Array.isArray(estadosUsuarios) || typeof estadosUsuarios !== 'object'
                || Object.values(estadosUsuarios).some(valor => typeof valor !== 'boolean')) {
            throw new Error('El formato de los estados de usuarios guardados es inválido.');
        }
        return estadosUsuarios;
    }

    function leerUsuarios() {
        const estadosUsuarios = leerEstadosUsuarios();
        return usuarios.map(usuario => ({
            ...usuario,
            activo: estadosUsuarios[usuario.id] ?? usuario.activo
        }));
    }

    function listarUsuarios() {
        exigirUsuario('Administrador');
        return leerUsuarios().map(({ id, nombre, correo, rol, activo }) => ({ id, nombre, correo, rol, activo }));
    }

    function cambiarEstadoUsuario(id, activo) {
        const administrador = exigirUsuario('Administrador');
        if (typeof activo !== 'boolean') {
            throw new Error('El estado de la cuenta es inválido.');
        }
        const cuenta = leerUsuarios().find(usuario => usuario.id === id);
        if (!cuenta) {
            throw new Error('La cuenta seleccionada no existe.');
        }
        if (!activo && administrador.id === cuenta.id) {
            throw new Error('La cuenta que administra el sistema debe permanecer habilitada.');
        }
        const estadosUsuarios = leerEstadosUsuarios();
        estadosUsuarios[id] = activo;
        localStorage.setItem(claveEstadosUsuarios, JSON.stringify(estadosUsuarios));
    }

    function obtenerUsuario() {
        const id = sessionStorage.getItem(claveSesion);
        return leerUsuarios().find(usuario => usuario.id === id && usuario.activo) || null;
    }

    function exigirUsuario(rol) {
        const usuario = obtenerUsuario();
        if (!usuario) {
            throw new Error('Inicia sesión para continuar.');
        }
        if (rol && usuario.rol !== rol) {
            throw new Error('Acceso denegado. Esta acción requiere el rol Administrador.');
        }
        return usuario;
    }

    function iniciarSesion(correo, clave) {
        sessionStorage.removeItem(claveSesion);
        const usuario = leerUsuarios().find(cuenta => cuenta.correo === correo.trim().toLowerCase() && cuenta.clave === clave);
        if (!usuario || !usuario.activo) {
            throw new Error('Credenciales incorrectas o cuenta deshabilitada.');
        }
        sessionStorage.setItem(claveSesion, usuario.id);
        return usuario;
    }

    function cerrarSesion() {
        sessionStorage.removeItem(claveSesion);
        location.replace('login.html');
    }

    function protegerPagina(rol) {
        try {
            return exigirUsuario(rol);
        } catch (error) {
            const motivo = obtenerUsuario() ? 'denegado' : 'sesion';
            const parametros = new URLSearchParams({ motivo });
            const servicio = new URLSearchParams(location.search).get('servicio');
            if (motivo === 'sesion' && location.pathname.endsWith('/solicitud.html') && servicios.includes(servicio)) {
                parametros.set('continuar', `solicitud.html?servicio=${encodeURIComponent(servicio)}`);
            }
            location.replace(`login.html?${parametros}`);
            return null;
        }
    }

    function leerSolicitudes() {
        const contenido = localStorage.getItem(claveSolicitudes);
        if (contenido === null) {
            return [];
        }
        let solicitudes;
        try {
            solicitudes = JSON.parse(contenido);
        } catch (error) {
            throw new Error('Los registros guardados tienen un formato inválido. Revisa el almacenamiento del navegador.');
        }
        if (!Array.isArray(solicitudes) || solicitudes.some(solicitud => !solicitud || solicitud.id == null || !solicitud.cliente || !solicitud.vehiculo)) {
            throw new Error('El formato de las solicitudes guardadas es inválido.');
        }
        return solicitudes;
    }

    function perteneceA(solicitud, usuario) {
        if (solicitud.clienteId) {
            return solicitud.clienteId === usuario.id;
        }
        return solicitud.cliente.correo.toLowerCase() === usuario.correo;
    }

    function listarSolicitudes(todas = false) {
        const usuario = exigirUsuario();
        if (todas) {
            exigirUsuario('Administrador');
            return leerSolicitudes();
        }
        return leerSolicitudes().filter(solicitud => perteneceA(solicitud, usuario));
    }

    function obtenerSolicitud(id) {
        const usuario = exigirUsuario('Administrador');
        const solicitud = listarSolicitudes(usuario.rol === 'Administrador').find(registro => String(registro.id) === String(id));
        if (!solicitud) {
            throw new Error('La solicitud ya no existe. Actualiza el listado.');
        }
        return solicitud;
    }

    function cuentasDisponibles(clienteActualId = null) {
        const usuario = exigirUsuario();
        if (usuario.rol === 'Administrador') {
            return leerUsuarios().filter(cuenta => cuenta.activo || cuenta.id === clienteActualId);
        }
        return [usuario];
    }

    function validarSolicitud(solicitud, anterior) {
        const vehiculo = solicitud.vehiculo;
        const cliente = solicitud.cliente;
        if (!cliente.nombre.trim() || !vehiculo.marca.trim() || !vehiculo.modelo.trim()) {
            throw new Error('Completa el nombre del cliente, la marca y el modelo.');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.correo) || !/^0\d{9}$/.test(cliente.telefono)) {
            throw new Error('Revisa el correo y el teléfono de 10 dígitos que empieza en 0.');
        }
        if (!/^[A-Z]{3}-\d{3,4}$/.test(vehiculo.placa)) {
            throw new Error('La placa debe tener tres letras, un guion y tres o cuatro números.');
        }
        if (!Number.isInteger(vehiculo.anio) || vehiculo.anio < 1900 || vehiculo.anio > new Date().getFullYear()) {
            throw new Error('El año debe estar entre 1900 y el año actual.');
        }
        if (!Number.isSafeInteger(vehiculo.kilometraje) || vehiculo.kilometraje < 0) {
            throw new Error('El kilometraje debe ser un número entero mayor o igual a cero.');
        }
        if (!servicios.includes(solicitud.servicio) || !['Preventivo', 'Correctivo'].includes(solicitud.tipoMantenimiento)) {
            throw new Error('Selecciona un servicio y un tipo de mantenimiento válidos.');
        }
        if (!Array.isArray(solicitud.adicionales) || solicitud.adicionales.some(valor => !adicionales.includes(valor)) || solicitud.observaciones.length > 500) {
            throw new Error('Revisa las opciones adicionales y las observaciones.');
        }
        const fechaHora = new Date(`${solicitud.fecha}T${solicitud.hora}`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(solicitud.fecha) || !/^\d{2}:\d{2}$/.test(solicitud.hora) || Number.isNaN(fechaHora.getTime())) {
            throw new Error('Selecciona una fecha y hora válidas.');
        }
        const [anio, mes, dia] = solicitud.fecha.split('-').map(Number);
        if (fechaHora.getFullYear() !== anio || fechaHora.getMonth() + 1 !== mes || fechaHora.getDate() !== dia) {
            throw new Error('Selecciona una fecha existente.');
        }
        if (solicitud.hora < '08:00' || solicitud.hora > '17:00') {
            throw new Error('El horario disponible es de 08:00 a 17:00.');
        }
        const conservaCita = anterior && anterior.fecha === solicitud.fecha && anterior.hora === solicitud.hora;
        if (!conservaCita && fechaHora <= new Date()) {
            throw new Error('Selecciona una fecha y hora futuras.');
        }
    }

    function guardarSolicitud(datos, id = null) {
        const usuario = exigirUsuario();
        const solicitudes = leerSolicitudes();
        let anterior = null;
        if (id !== null) {
            exigirUsuario('Administrador');
            anterior = solicitudes.find(registro => String(registro.id) === String(id));
            if (!anterior) {
                throw new Error('La solicitud ya no existe. Actualiza el listado.');
            }
        }
        const clienteId = usuario.rol === 'Administrador' ? datos.clienteId : usuario.id;
        const cuenta = cuentasDisponibles(anterior?.clienteId).find(cliente => cliente.id === clienteId);
        if (!cuenta) {
            throw new Error('Selecciona una cuenta de cliente habilitada.');
        }
        const solicitud = {
            ...datos,
            id: anterior ? anterior.id : crypto.randomUUID(),
            clienteId: cuenta.id,
            cliente: { nombre: cuenta.nombre, correo: cuenta.correo, telefono: datos.cliente.telefono },
            estado: anterior ? anterior.estado : 'Pendiente'
        };
        validarSolicitud(solicitud, anterior);
        if (anterior) {
            const posicion = solicitudes.indexOf(anterior);
            solicitudes[posicion] = solicitud;
        } else {
            solicitudes.push(solicitud);
        }
        localStorage.setItem(claveSolicitudes, JSON.stringify(solicitudes));
        return solicitud;
    }

    function cambiarEstado(id, estado) {
        exigirUsuario('Administrador');
        if (!estados.includes(estado)) {
            throw new Error('Selecciona un estado válido.');
        }
        const solicitudes = leerSolicitudes();
        const solicitud = solicitudes.find(registro => String(registro.id) === String(id));
        if (!solicitud) {
            throw new Error('La solicitud ya no existe.');
        }
        solicitud.estado = estado;
        localStorage.setItem(claveSolicitudes, JSON.stringify(solicitudes));
    }

    function eliminarSolicitud(id) {
        exigirUsuario('Administrador');
        const solicitudes = leerSolicitudes();
        if (!solicitudes.some(solicitud => String(solicitud.id) === String(id))) {
            throw new Error('La solicitud ya no existe.');
        }
        const restantes = solicitudes.filter(solicitud => String(solicitud.id) !== String(id));
        localStorage.setItem(claveSolicitudes, JSON.stringify(restantes));
    }

    function mostrarError(error) {
        const mensaje = document.querySelector('#mensajePagina');
        mensaje.textContent = error.message;
        mensaje.className = 'alert alert-danger';
        mensaje.hidden = false;
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Revisa la operación', text: error.message });
        }
    }

    function prepararNavegacion() {
        const usuario = obtenerUsuario();
        document.querySelectorAll('[data-solo-sesion]').forEach(elemento => elemento.hidden = !usuario);
        document.querySelectorAll('[data-solo-invitado]').forEach(elemento => elemento.hidden = Boolean(usuario));
        document.querySelectorAll('[data-solo-admin]').forEach(elemento => elemento.hidden = usuario?.rol !== 'Administrador');
        document.querySelectorAll('[data-cerrar-sesion]').forEach(boton => boton.addEventListener('click', cerrarSesion));
        const menu = document.querySelector('#menuPrincipal');
        menu?.addEventListener('click', evento => {
            if (evento.target.closest('a[href^="#"]') && menu.classList.contains('show') && typeof bootstrap !== 'undefined') {
                bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
            }
        });
    }

    function comprobarCuentaHabilitada() {
        if (sessionStorage.getItem(claveSesion) && !obtenerUsuario()) {
            sessionStorage.removeItem(claveSesion);
            const contenido = document.querySelector('main');
            if (contenido) {
                contenido.hidden = true;
            }
            location.replace('login.html?motivo=deshabilitado');
        }
    }

    window.addEventListener('storage', evento => {
        if (evento.key === claveEstadosUsuarios || evento.key === null) {
            comprobarCuentaHabilitada();
        }
    });
    window.addEventListener('focus', comprobarCuentaHabilitada);

    window.addEventListener('pageshow', evento => {
        if (evento.persisted) {
            location.reload();
        }
    });

    prepararNavegacion();

    return {
        obtenerUsuario, iniciarSesion, cerrarSesion, protegerPagina, listarSolicitudes,
        obtenerSolicitud, cuentasDisponibles, guardarSolicitud, cambiarEstado,
        eliminarSolicitud, mostrarError, estados, listarUsuarios, cambiarEstadoUsuario
    };
})();
