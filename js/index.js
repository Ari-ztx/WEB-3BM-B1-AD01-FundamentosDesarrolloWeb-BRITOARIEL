const menuPrincipal = document.querySelector('#menuPrincipal');

menuPrincipal?.addEventListener('click', evento => {
    const enlaceInterno = evento.target.closest('a[href^="#"]');
    if (enlaceInterno && menuPrincipal.classList.contains('show') && typeof bootstrap !== 'undefined') {
        bootstrap.Collapse.getOrCreateInstance(menuPrincipal, { toggle: false }).hide();
    }
});
