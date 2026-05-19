// ==========================================
// 1. BASES DE DATOS (Conectadas a Supabase)
// ==========================================
let productosDB = [];
let paquetesDB = [];
let eventosDB = [];
let usuariosDB = [];
let cotizacionesDB = [];

// ✨ NUEVO: Función para descargar todo desde Supabase al iniciar
async function cargarDatosDesdeSupabase() {
    try {
        if (typeof supabaseClient === 'undefined') return;

        // Descargamos las tablas (Si no existen aún, devolverán un array vacío sin romper la app)
        let { data: productos } = await supabaseClient.from('Productos').select('*');
        if (productos) productosDB = productos;

        let { data: paquetes } = await supabaseClient.from('Paquetes').select('*');
        if (paquetes) paquetesDB = paquetes;

        let { data: eventos } = await supabaseClient.from('Eventos').select('*');
        if (eventos) eventosDB = eventos;

        // Descargamos las cotizaciones
        let { data: cotizaciones } = await supabaseClient.from('Cotizaciones').select('*');
        if (cotizaciones) cotizacionesDB = cotizaciones;

        // Refrescar interfaz si estamos en la pantalla del menú
        if (document.getElementById('calendario-js')) {
            renderizarCalendario();
            cargarDatosDashboard();
        }
        
        // Refrescar interfaz si estamos en Inventario
        if (document.getElementById('tabla-productos')) {
            if (typeof renderizarInventario === 'function') renderizarInventario();
            if (typeof renderizarPaquetes === 'function') renderizarPaquetes();
            if (typeof renderizarProductosEnPaquete === 'function') renderizarProductosEnPaquete();
        }
        
        // Refrescar interfaz si estamos en Cotizaciones
        if (document.getElementById('tabla-cotizaciones')) {
            if (typeof cargarDatosCotizacion === 'function') cargarDatosCotizacion();
            if (typeof renderizarHistorialCotizaciones === 'function') renderizarHistorialCotizaciones();
        }
    } catch (error) {
        console.error("Error al sincronizar con Supabase:", error);
    }
}

// ==========================================
// 2. UTILIDADES Y SESIÓN
// ==========================================
function mostrarAlerta(icono, titulo, mensaje) {
    const icon = document.getElementById('alerta-icono');
    const title = document.getElementById('alerta-titulo');
    const msg = document.getElementById('alerta-mensaje');
    const alerta = document.getElementById('mi-alerta');
    if (icon && title && msg && alerta) {
        icon.innerText = icono; title.innerText = titulo; msg.innerHTML = mensaje; 
        alerta.style.display = 'flex';
    }
}

function cerrarAlerta() { 
    const alerta = document.getElementById('mi-alerta');
    if (alerta) alerta.style.display = 'none'; 
}

// ✨ NUEVO: Cierre de sesión creativo y seguro
function cerrarSesion() { 
    mostrarAlerta("👋", "Hasta pronto", "Cerrando sesión de forma segura...");
    
    // Redirigimos al usuario rápidamente al login
    setTimeout(() => {
        localStorage.removeItem('nombreUsuario'); 
        localStorage.removeItem('rolUsuario'); 
        window.location.href = "index.html"; 
    }, 800);
}

function verificarAcceso() {
    const usuarioActivo = localStorage.getItem('nombreUsuario');
    if (!usuarioActivo && !document.getElementById('loginForm')) {
        window.location.href = "index.html"; 
    }
}

// ✨ NUEVO: Control de Permisos por Rol
function aplicarPermisos() {
    const rol = localStorage.getItem('rolUsuario');
    if (!rol) return;

    if (rol === 'empleado') {
        // Ocultar la opción de inventario del sidebar en todas las pantallas
        const linksMenu = document.querySelectorAll('.menu-item');
        linksMenu.forEach(link => {
            if (link.getAttribute('href') === 'inventario.html') {
                link.style.display = 'none';
            }
        });

        // Expulsar al empleado si intenta entrar a la fuerza usando la URL
        if (window.location.href.includes('inventario.html')) {
            window.location.href = "menu.html";
        }
    }
}

// ==========================================
// 3. LÓGICA DE PAQUETES Y CATÁLOGO VISUAL (CUADRÍCULA)
// ==========================================

// ✨ NUEVO: Abre una ventana elegante con la cuadrícula de paquetes y fotos
function abrirCatalogoVisual() {
    const grid = document.getElementById('grid-paquetes-visual');
    const modal = document.getElementById('modal-catalogo-visual');
    
    if (!grid || !modal) {
        console.error("Faltan los contenedores HTML para el catálogo visual.");
        return;
    }
    
    grid.innerHTML = ''; // Limpiamos la vista anterior

    // Recorremos cada paquete en la base de datos simulada
    paquetesDB.forEach(paq => {
        // 🎨 TOQUE CREATIVO: Generador de logotipos automáticos si no hay foto real
        // Crea una imagen con las iniciales del paquete, usando tus colores (Arena y Blanco)
        let imagenUrl = paq.imagen_url ? paq.imagen_url : `https://ui-avatars.com/api/?name=${paq.nombre}&background=D4A373&color=fff&size=300&font-size=0.33&bold=true`;

        // ✨ NUEVO: Construir lista de artículos incluidos para mostrar
        let incluyeHtml = '';
        if (paq.productos_incluidos && typeof paq.productos_incluidos === 'object') {
            let items = [];
            for (const [idStr, qty] of Object.entries(paq.productos_incluidos)) {
                let p = productosDB.find(prod => prod.id == idStr);
                if (p) items.push(`${qty}x ${p.nombre}`);
            }
            if (items.length > 0) incluyeHtml = `<br><span style="color: var(--primario); font-weight: 600;">Incluye:</span> ${items.join(', ')}`;
        }

        // Construimos la tarjeta visual
        grid.innerHTML += `
            <div class="card-paquete-creativo" style="background: var(--tarjeta-bg); border: 1px solid var(--borde); border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.3s;">
                <div class="card-img-container" style="position: relative; height: 180px; width: 100%; background: #eee;">
                    <img src="${imagenUrl}" alt="${paq.nombre}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="card-precio-tag" style="position: absolute; bottom: 10px; right: 10px; background: var(--primario); color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        $${paq.precio.toFixed(2)}
                    </div>
                </div>
                <div class="card-info" style="padding: 20px; text-align: center;">
                    <h3 style="color: var(--primario); margin: 0 0 10px 0;">${paq.nombre}</h3>
                    <div style="color: var(--texto-claro); font-size: 0.85rem; margin-bottom: 20px; text-align: left; height: 75px; overflow-y: auto;">
                        ${paq.descripcion || "Sin descripción."}
                        ${incluyeHtml}
                    </div>
                    <button type="button" class="btn-primario" style="padding: 10px 20px; font-size: 0.9rem; margin-top: 0;" onclick="elegirPaqueteDesdeGrid(${paq.id}, '${paq.nombre}')">
                        ✨ Seleccionar
                    </button>
                </div>
            </div>
        `;
    });

    // Mostramos la ventana flotante
    modal.style.display = 'flex';
}

// ✨ NUEVO: Procesa la selección que hizo el usuario en la cuadrícula
function elegirPaqueteDesdeGrid(idPaquete, nombrePaquete) {
    // 1. Guardamos el ID en el select original (ahora puede estar oculto con CSS si quieres)
    const selectPaquete = document.getElementById('ev-paquete');
    if (selectPaquete) selectPaquete.value = idPaquete;

    // 2. Mostramos visualmente en el formulario qué paquete escogió
    const displaySeleccion = document.getElementById('display-paquete-elegido');
    if (displaySeleccion) {
        displaySeleccion.innerHTML = `✅ Paquete seleccionado: <strong>${nombrePaquete}</strong>`;
            displaySeleccion.setAttribute('data-paquete-id', idPaquete);
        displaySeleccion.style.display = 'block';
    }

    // 3. Cerramos el catálogo
    cerrarCatalogoVisual();
}

function cerrarCatalogoVisual() {
    const modal = document.getElementById('modal-catalogo-visual');
    if (modal) modal.style.display = 'none';
}


// ==========================================
// 4. LÓGICA DE AGENDA Y EVENTOS (CALENDARIO)
// ==========================================
let fechaActual = new Date(2026, 3); // Abril 2026
let fechaSeleccionada = "";

function cargarDatosDashboard() {
    const contenedor = document.getElementById('ev-extras-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    productosDB.forEach(prod => {
        contenedor.innerHTML += `
            <div class="extra-card">
                <div class="extra-info">
                    <h4>${prod.nombre}</h4><span class="badge-stock-mini">Disp: ${prod.stock}</span>
                </div>
                <div class="extra-controls">
                    <button type="button" class="btn-qty" onclick="cambiarCantidadExtra(${prod.id}, -1)">-</button>
                    <input type="number" id="ev-extra-${prod.id}" min="0" max="${prod.stock}" value="0" readonly>
                    <button type="button" class="btn-qty" onclick="cambiarCantidadExtra(${prod.id}, 1)">+</button>
                </div>
            </div>`;
    });
}

function cambiarCantidadExtra(id, cambio) {
    let input = document.getElementById(`ev-extra-${id}`);
    if(!input) return;
    let actual = parseInt(input.value) || 0;
    let maximo = parseInt(input.max) || 0;
    let nueva = actual + cambio;
    if(nueva >= 0 && nueva <= maximo) input.value = nueva;
}

function renderizarCalendario() {
    const display = document.getElementById('mes-anio-display');
    const contenedor = document.getElementById('calendario-js');
    if(!display || !contenedor) return;

    // ✨ NUEVO: Inyectar buscador de clientes dinámicamente arriba del calendario
    let buscadorContenedor = document.getElementById('contenedor-buscador-eventos');
    if (!buscadorContenedor) {
        const header = document.querySelector('.calendar-header');
        if (header) {
            header.insertAdjacentHTML('beforebegin', `
                <div id="contenedor-buscador-eventos" style="margin-bottom: 20px; position: relative;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2rem;">🔍</span>
                        <input type="text" id="buscador-eventos" placeholder="Buscar cliente para ver sus fechas agendadas..." 
                            style="padding: 12px; border-radius: 10px; border: 1.5px solid var(--borde); width: 100%; font-family: inherit;"
                            oninput="buscarEventosPorCliente()" onclick="buscarEventosPorCliente()">
                    </div>
                    <div id="resultados-busqueda-eventos" style="display:none; position:absolute; top: 100%; left: 0; width: 100%; background: var(--tarjeta-bg); border: 1px solid var(--borde); border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 100; max-height: 250px; overflow-y: auto; margin-top: 5px;"></div>
                </div>
            `);
        }
    }

    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    display.innerText = `${nombres[mes]} ${anio}`;
    contenedor.innerHTML = '';
    
    ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(d => contenedor.innerHTML += `<div class="day-name">${d}</div>`);

    const primerDiaIndex = new Date(anio, mes, 1).getDay();
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    for (let i = 0; i < primerDiaIndex; i++) { contenedor.innerHTML += `<div class="day dia-vacio"></div>`; }

    for (let dia = 1; dia <= diasEnMes; dia++) {
        let fechaLoop = `${anio}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        let eventosDelDia = eventosDB.filter(e => e.fecha === fechaLoop);
        let claseBase = 'dia-disponible'; 
        
        if (eventosDelDia.length >= 3) claseBase = 'dia-ocupado'; 
        else if (eventosDelDia.length > 0) claseBase = 'dia-parcial'; 
        if (fechaSeleccionada === fechaLoop) claseBase += ' dia-seleccionado';
        
        contenedor.innerHTML += `<div class="day ${claseBase}" onclick="clickEnFecha('${fechaLoop}')">${dia}</div>`;
    }
}

function cambiarMes(offset) { 
    fechaActual.setMonth(fechaActual.getMonth() + offset); 
    renderizarCalendario(); 
}

// ✨ NUEVO: Función para buscar eventos y fechas de un cliente
function buscarEventosPorCliente() {
    const input = document.getElementById('buscador-eventos');
    const resultadosBox = document.getElementById('resultados-busqueda-eventos');
    if (!input || !resultadosBox) return;

    const busqueda = input.value.trim().toLowerCase();
    if (busqueda === "") {
        resultadosBox.style.display = 'none';
        return;
    }

    const coincidencias = eventosDB.filter(e => e.cliente && e.cliente.toLowerCase().includes(busqueda));

    if (coincidencias.length === 0) {
        resultadosBox.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--texto-claro);">No se encontraron eventos para este cliente.</div>';
    } else {
        let html = '';
        coincidencias.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        coincidencias.forEach(e => {
            html += `
                <div style="padding: 12px 15px; border-bottom: 1px solid var(--borde); cursor: pointer; transition: background 0.2s;" 
                     onmouseover="this.style.background='var(--fondo)'" 
                     onmouseout="this.style.background='transparent'"
                     onclick="irAFechaYSeleccionar('${e.fecha}')">
                    <div style="font-weight: 600; color: var(--primario);">${e.cliente}</div>
                    <div style="font-size: 0.85rem; color: var(--texto-claro);">📅 Fecha: <strong>${e.fecha}</strong> (${e.horaInicio} - ${e.horaFin})</div>
                </div>
            `;
        });
        resultadosBox.innerHTML = html;
    }
    resultadosBox.style.display = 'block';
}

// ✨ NUEVO: Salta directamente al mes y día del evento buscado
function irAFechaYSeleccionar(fechaStr) {
    const [anio, mes, dia] = fechaStr.split('-');
    fechaActual = new Date(parseInt(anio), parseInt(mes) - 1, 1);
    
    document.getElementById('buscador-eventos').value = '';
    document.getElementById('resultados-busqueda-eventos').style.display = 'none';
    
    renderizarCalendario();
    clickEnFecha(fechaStr);
}

function clickEnFecha(fechaStr) {
    fechaSeleccionada = fechaStr;
    const evFecha = document.getElementById('ev-fecha');
    if (evFecha) evFecha.value = fechaStr;
    limpiarFormularioEvento();
    if (evFecha) evFecha.value = fechaStr; // Restaurar tras limpiar

    let eventosDelDia = eventosDB.filter(e => e.fecha === fechaStr);
    const msgHorarios = document.getElementById('msg-horarios-ocupados');
    
    if (eventosDelDia.length > 0 && msgHorarios) {
        let html = "<strong>⚠️ Horarios ocupados este día:</strong><br>";
        eventosDelDia.forEach(e => {
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-bottom: 1px dashed #ccc; padding-bottom:8px;">
                <span>• ${e.horaInicio} a ${e.horaFin} hrs. (${e.cliente})</span>
                <div>
                    <button type="button" onclick="cargarEventoParaEditar('${e.cliente}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button type="button" onclick="eliminarEventoLista('${e.cliente}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </div>
            </div>`;
        });
        msgHorarios.innerHTML = html;
        msgHorarios.style.display = 'block';
    } else if (msgHorarios) {
        msgHorarios.style.display = 'none';
    }
    renderizarCalendario(); 
}

async function guardarEvento() {
    if (!fechaSeleccionada) return mostrarAlerta("⚠️", "Atención", "Selecciona un día en el calendario.");
    
    const inputCliente = document.getElementById('ev-cliente');
    const clienteOriginal = inputCliente.getAttribute('data-original');
    
    // Rescatamos el paquete directamente desde el indicador visual por si el <select> fue borrado
    let paqueteVal = null;
    const displaySeleccion = document.getElementById('display-paquete-elegido');
    if (displaySeleccion && displaySeleccion.hasAttribute('data-paquete-id')) {
        paqueteVal = displaySeleccion.getAttribute('data-paquete-id');
    } else if (document.getElementById('ev-paquete') && document.getElementById('ev-paquete').value) {
        paqueteVal = document.getElementById('ev-paquete').value;
    }

    let eventoFinal = { 
        fecha: fechaSeleccionada, 
        horaInicio: document.getElementById('ev-hora-inicio').value, 
        horaFin: document.getElementById('ev-hora-fin').value, 
        cliente: inputCliente.value, 
        paqueteId: paqueteVal ? parseInt(paqueteVal) : null, 
        extras: {} 
    };
    
    if (!eventoFinal.cliente || !eventoFinal.horaInicio || !eventoFinal.horaFin) 
        return mostrarAlerta("⚠️", "Incompleto", "Ingresa cliente y horarios.");

    productosDB.forEach(p => {
        let val = document.getElementById(`ev-extra-${p.id}`)?.value;
        if(val > 0) eventoFinal.extras[p.id] = parseInt(val);
    });

    try {
        if (clienteOriginal) {
            // Actualizamos en la nube
            const { error } = await supabaseClient.from('Eventos').update(eventoFinal).eq('fecha', fechaSeleccionada).eq('cliente', clienteOriginal);
            if (error) throw error;
            mostrarAlerta("✅", "Actualizado", "Evento modificado con éxito en la nube.");
        } else {
            // Insertamos en la nube
            const { error } = await supabaseClient.from('Eventos').insert([eventoFinal]);
            if (error) throw error;
            mostrarAlerta("✨", "Agendado", "Nuevo evento guardado en la nube.");
        }
        
        // Volvemos a descargar los datos actualizados y refrescamos la pantalla
        await cargarDatosDesdeSupabase();
        clickEnFecha(fechaSeleccionada); 
    } catch (error) {
        console.error("Error al guardar Evento:", error);
        mostrarAlerta("❌", "Error al guardar", `No se pudo registrar. Razón: ${error.message}`);
    }
}

function cargarEventoParaEditar(cliente) {
    let ev = eventosDB.find(e => e.fecha === fechaSeleccionada && e.cliente === cliente);
    if (ev) {
        document.getElementById('titulo-form-evento').innerText = "✏️ Editar Evento";
        document.getElementById('ev-cliente').value = ev.cliente;
        document.getElementById('ev-cliente').setAttribute('data-original', cliente); 
        
        if (document.getElementById('ev-paquete')) document.getElementById('ev-paquete').value = ev.paqueteId || "";
        
        // Actualizar visualmente qué paquete tiene
        const paq = paquetesDB.find(p => p.id == ev.paqueteId);
        if (paq && document.getElementById('display-paquete-elegido')) {
            document.getElementById('display-paquete-elegido').innerHTML = `✅ Paquete seleccionado: <strong>${paq.nombre}</strong>`;
            document.getElementById('display-paquete-elegido').setAttribute('data-paquete-id', paq.id);
            document.getElementById('display-paquete-elegido').style.display = 'block';
        }

        document.getElementById('ev-hora-inicio').value = ev.horaInicio;
        document.getElementById('ev-hora-fin').value = ev.horaFin;

        productosDB.forEach(p => {
            let inputExtra = document.getElementById(`ev-extra-${p.id}`);
            if(inputExtra) inputExtra.value = ev.extras[p.id] || 0;
        });

        document.getElementById('btn-guardar-evento').style.display = 'none';
        document.getElementById('grupo-editar-evento').style.display = 'flex';
    }
}

function eliminarEvento() {
    eliminarEventoLista(document.getElementById('ev-cliente').getAttribute('data-original'));
}

async function eliminarEventoLista(cliente) {
    if(confirm("¿Seguro que deseas cancelar este evento?")) {
        try {
            const { error } = await supabaseClient.from('Eventos').delete().eq('fecha', fechaSeleccionada).eq('cliente', cliente);
            if (error) throw error;
            mostrarAlerta("🗑️", "Cancelado", "El evento ha sido borrado de la base de datos.");
            await cargarDatosDesdeSupabase();
            clickEnFecha(fechaSeleccionada);
        } catch (error) {
            console.error("Error al eliminar evento:", error);
            mostrarAlerta("❌", "Error al eliminar", `No se pudo borrar. Razón: ${error.message}`);
        }
    }
}

function limpiarFormularioEvento() {
    document.getElementById('titulo-form-evento').innerText = "✨ Crear Nuevo Evento";
    document.getElementById('ev-fecha').value = "";
    document.getElementById('ev-cliente').value = "";
    document.getElementById('ev-cliente').removeAttribute('data-original');
    
    if(document.getElementById('ev-paquete')) document.getElementById('ev-paquete').value = "";
    if(document.getElementById('display-paquete-elegido')) {
        document.getElementById('display-paquete-elegido').style.display = 'none';
        document.getElementById('display-paquete-elegido').removeAttribute('data-paquete-id');
    }
    
    if(document.getElementById('ev-hora-inicio')) document.getElementById('ev-hora-inicio').value = "";
    if(document.getElementById('ev-hora-fin')) document.getElementById('ev-hora-fin').value = "";
    
    productosDB.forEach(p => {
        let i = document.getElementById(`ev-extra-${p.id}`);
        if(i) i.value = 0;
    });
    document.getElementById('btn-guardar-evento').style.display = 'block';
    document.getElementById('grupo-editar-evento').style.display = 'none';
}

// ==========================================
// 5. LÓGICA DE INVENTARIO Y PAQUETES (SUPABASE)
// ==========================================
function renderizarInventario() {
    const tbody = document.getElementById('tabla-productos');
    if (!tbody) return;
    tbody.innerHTML = '';

    productosDB.forEach(prod => {
        let claseStock = 'stock-ok';
        if (prod.stock < 20) claseStock = 'stock-critico';
        else if (prod.stock < 50) claseStock = 'stock-medio';

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600;">${prod.nombre}</td>
                <td><span class="badge-stock ${claseStock}">${prod.stock} u.</span></td>
                <td>$${parseFloat(prod.precio).toFixed(2)}</td>
                <td>
                    <button class="btn-icon" onclick="editarProducto(${prod.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="eliminarProducto(${prod.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    });
    revisarStockBajo();
}

async function guardarProducto() {
    const idInput = document.getElementById('inv-id').value;
    const nombre = document.getElementById('inv-nombre').value;
    const stock = parseInt(document.getElementById('inv-stock').value);
    const precio = parseFloat(document.getElementById('inv-precio').value);

    if (!nombre || isNaN(stock) || isNaN(precio)) return mostrarAlerta("⚠️", "Campos vacíos", "Llena todos los campos.");
    
    try {
        // Validación directa con Supabase (más seguro si hay múltiples usuarios)
        let query = supabaseClient.from('Productos').select('id').ilike('nombre', nombre.trim());
        if (idInput) query = query.neq('id', idInput);
        
        const { data: duplicados } = await query;
        if (duplicados && duplicados.length > 0) {
            return mostrarAlerta("⚠️", "Nombre duplicado", "Ya existe un artículo con este nombre en la base de datos.");
        }

        if (idInput) {
            const { error } = await supabaseClient.from('Productos').update({ nombre, stock, precio }).eq('id', idInput);
            if (error) throw error;
            mostrarAlerta("✅", "Actualizado", "Artículo actualizado en Supabase.");
        } else {
            const { error } = await supabaseClient.from('Productos').insert([{ nombre, stock, precio }]);
            if (error) throw error;
            mostrarAlerta("✨", "Guardado", "Nuevo artículo agregado.");
        }
        await cargarDatosDesdeSupabase();
        cancelarEdicionProd();
    } catch (error) {
        console.error(error);
        mostrarAlerta("❌", "Error", "No se guardó el artículo.");
        console.error("Error al guardar Producto:", error);
        mostrarAlerta("❌", "Error al guardar", `Razón: ${error.message || "Permiso denegado (Revisa el RLS)"}`);
    }
}

function editarProducto(id) {
    const producto = productosDB.find(p => p.id === id);
    if (!producto) return;
    document.getElementById('titulo-form-producto').innerText = "✏️ Editar Artículo";
    document.getElementById('inv-id').value = producto.id;
    document.getElementById('inv-nombre').value = producto.nombre;
    document.getElementById('inv-stock').value = producto.stock;
    document.getElementById('inv-precio').value = producto.precio;
    document.getElementById('btn-guardar-prod').innerText = "Actualizar Artículo";
    document.getElementById('btn-cancelar-prod').style.display = "block";
}

async function eliminarProducto(id) {
    if(confirm("¿Estás seguro de eliminar este artículo?")) {
        try {
            const { error } = await supabaseClient.from('Productos').delete().eq('id', id);
            if (error) throw error;
            mostrarAlerta("🗑️", "Eliminado", "Artículo borrado de Supabase.");
            await cargarDatosDesdeSupabase();
        } catch (error) {
            console.error(error);
            mostrarAlerta("❌", "Error", "No se eliminó el artículo.");
        }
    }
}

function cancelarEdicionProd() {
    document.getElementById('titulo-form-producto').innerText = "✨ Agregar Nuevo Artículo";
    document.getElementById('inv-id').value = "";
    document.getElementById('inv-nombre').value = "";
    document.getElementById('inv-stock').value = "";
    document.getElementById('inv-precio').value = "";
    document.getElementById('btn-guardar-prod').innerText = "Guardar Artículo";
    document.getElementById('btn-cancelar-prod').style.display = "none";
}

// ✨ NUEVO: Muestra la imagen seleccionada en el formulario antes de guardarla
function previsualizarImagenPaquete(event) {
    const previewContainer = document.getElementById('paq-imagen-preview-container');
    const previewImage = document.getElementById('paq-imagen-preview');
    if (event.target.files && event.target.files[0] && previewContainer && previewImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
        }
        reader.readAsDataURL(event.target.files[0]);
    }
}

// ✨ NUEVO: Dibuja la lista de inventario dentro del creador de paquetes
function renderizarProductosEnPaquete() {
    const container = document.getElementById('paq-productos-container');
    if (!container) return;
    container.innerHTML = '';
    productosDB.forEach(prod => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom: 8px; border-bottom: 1px solid var(--borde);">
                <span style="font-size:0.95rem; font-weight: 500; color: var(--texto);">${prod.nombre}</span>
                <input type="number" id="paq-prod-${prod.id}" min="0" value="0" style="width:80px; padding: 8px; border-radius: 8px; border: 2px solid var(--borde); text-align: center;">
            </div>
        `;
    });
}

function renderizarPaquetes() {
    const tbody = document.getElementById('tabla-paquetes');
    if (!tbody) return;
    tbody.innerHTML = '';
    paquetesDB.forEach(paq => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600; color: var(--primario);">${paq.nombre}</td>
                <td><span style="color: var(--primario); font-weight: bold;">$${parseFloat(paq.precio).toFixed(2)}</span></td>
                <td>
                    <button class="btn-icon" onclick="editarPaquete(${paq.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="eliminarPaquete(${paq.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function guardarPaquete() {
    const idInput = document.getElementById('paq-id').value;
    const nombre = document.getElementById('paq-nombre').value;
    const precio = parseFloat(document.getElementById('paq-precio').value);
    const descripcion = document.getElementById('paq-descripcion') ? document.getElementById('paq-descripcion').value : "";
    const imagenInput = document.getElementById('paq-imagen');
    const imagenFile = imagenInput ? imagenInput.files[0] : null;

    if (!nombre || isNaN(precio)) return mostrarAlerta("⚠️", "Campos vacíos", "Ingresa nombre y precio.");

    let productosIncluidos = {};
    productosDB.forEach(prod => {
        let input = document.getElementById(`paq-prod-${prod.id}`);
        if (input && parseInt(input.value) > 0) {
            productosIncluidos[prod.id] = parseInt(input.value);
        }
    });

    try {
        // Validación directa con Supabase para paquetes
        let query = supabaseClient.from('Paquetes').select('id').ilike('nombre', nombre.trim());
        if (idInput) query = query.neq('id', idInput);
        
        const { data: duplicados } = await query;
        if (duplicados && duplicados.length > 0) {
            return mostrarAlerta("⚠️", "Nombre duplicado", "Ya existe un paquete con este nombre en la base de datos.");
        }

        let paqueteFinal = { 
            nombre, 
            precio, 
            descripcion, 
            productos_incluidos: productosIncluidos
        };

        // Si se seleccionó un archivo nuevo, lo subimos
        if (imagenFile) {
            const filePath = `public/${Date.now()}-${imagenFile.name}`;
            const { error: uploadError } = await supabaseClient
                .storage
                .from('paquetes-imagenes') // Nombre del bucket
                .upload(filePath, imagenFile);

            if (uploadError) throw uploadError;

            // Obtenemos la URL pública para guardarla
            const { data: urlData } = supabaseClient
                .storage
                .from('paquetes-imagenes')
                .getPublicUrl(filePath);
            
            paqueteFinal.imagen_url = urlData.publicUrl;
        }

        if (idInput) {
            const { error } = await supabaseClient.from('Paquetes').update(paqueteFinal).eq('id', idInput);
            if (error) throw error;
            mostrarAlerta("✅", "Actualizado", "Paquete actualizado en Supabase.");
        } else {
            const { error } = await supabaseClient.from('Paquetes').insert([paqueteFinal]);
            if (error) throw error;
            mostrarAlerta("✨", "Guardado", "Nuevo paquete agregado a Supabase.");
        }
        await cargarDatosDesdeSupabase();
        cancelarEdicionPaq();
    } catch (error) {
        console.error("Error al guardar Paquete:", error);
        mostrarAlerta("❌", "Error al guardar", `Razón: ${error.message || "Permiso denegado (Revisa el RLS)"}`);
    }
}

function editarPaquete(id) {
    const paquete = paquetesDB.find(p => p.id === id);
    if (!paquete) return;
    document.getElementById('titulo-form-paquete').innerText = "✏️ Editar Paquete";
    document.getElementById('paq-id').value = paquete.id;
    document.getElementById('paq-nombre').value = paquete.nombre;
    document.getElementById('paq-precio').value = paquete.precio;
    if(document.getElementById('paq-descripcion')) document.getElementById('paq-descripcion').value = paquete.descripcion || "";

    // Muestra la previsualización de la imagen existente
    const previewContainer = document.getElementById('paq-imagen-preview-container');
    const previewImage = document.getElementById('paq-imagen-preview');
    if (paquete.imagen_url && previewContainer && previewImage) {
        previewImage.src = paquete.imagen_url;
        previewContainer.style.display = 'block';
    } else if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    productosDB.forEach(prod => {
        let input = document.getElementById(`paq-prod-${prod.id}`);
        if (input) {
            input.value = (paquete.productos_incluidos && paquete.productos_incluidos[prod.id]) ? paquete.productos_incluidos[prod.id] : 0;
        }
    });
    document.getElementById('btn-guardar-paq').innerText = "Actualizar Paquete";
    document.getElementById('btn-cancelar-paq').style.display = "block";
}

async function eliminarPaquete(id) {
    if(confirm("¿Estás seguro de eliminar este paquete?")) {
        try {
            const { error } = await supabaseClient.from('Paquetes').delete().eq('id', id);
            if(error) throw error;
            mostrarAlerta("🗑️", "Eliminado", "Paquete borrado de Supabase.");
            await cargarDatosDesdeSupabase();
        } catch (error) {
            console.error(error);
            mostrarAlerta("❌", "Error", "No se eliminó el paquete.");
        }
    }
}

function cancelarEdicionPaq() {
    document.getElementById('titulo-form-paquete').innerText = "✨ Crear Nuevo Paquete";
    document.getElementById('paq-id').value = "";
    document.getElementById('paq-nombre').value = "";
    document.getElementById('paq-precio').value = "";
    if(document.getElementById('paq-descripcion')) document.getElementById('paq-descripcion').value = "";

    // Limpia la previsualización y el input de la imagen
    const imagenInput = document.getElementById('paq-imagen');
    if (imagenInput) imagenInput.value = "";
    const previewContainer = document.getElementById('paq-imagen-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    const previewImage = document.getElementById('paq-imagen-preview');
    if (previewImage) previewImage.src = "#";

    productosDB.forEach(prod => {
        let input = document.getElementById(`paq-prod-${prod.id}`);
        if (input) input.value = 0;
    });
    document.getElementById('btn-guardar-paq').innerText = "Guardar Paquete";
    document.getElementById('btn-cancelar-paq').style.display = "none";
}

function revisarStockBajo() {
    const panel = document.getElementById('panel-alertas-stock');
    const lista = document.getElementById('lista-alertas-stock');
    if (!panel || !lista) return;
    const articulosCriticos = productosDB.filter(prod => prod.stock < 20);
    if (articulosCriticos.length > 0) {
        lista.innerHTML = '';
        articulosCriticos.forEach(prod => {
            lista.innerHTML += `<li>🛑 <strong>${prod.nombre}</strong>: Quedan solo ${prod.stock} unidades. ¡Compra recomendada!</li>`;
        });
        panel.style.display = 'block'; 
    } else {
        panel.style.display = 'none'; 
    }
}

// ==========================================
// 6. LÓGICA DE COTIZACIONES (SUPABASE)
// ==========================================
let cotizacionEnEdicion = null;

function cargarDatosCotizacion() {
    const selectPaquete = document.getElementById('cot-paquete');
    const contenedorExtras = document.getElementById('cot-extras-container');
    if (!selectPaquete || !contenedorExtras) return; 

    selectPaquete.innerHTML = '<option value="">-- Sin paquete --</option>';
    paquetesDB.forEach(paq => {
        selectPaquete.innerHTML += `<option value="${paq.id}">${paq.nombre} - $${paq.precio}</option>`;
    });

    contenedorExtras.innerHTML = '';
    productosDB.forEach(prod => {
        contenedorExtras.innerHTML += `
            <div class="extra-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:0.9rem; font-weight:600;">${prod.nombre} <br><small style="color:var(--texto-claro)">$${prod.precio} c/u</small></span>
                <input type="number" id="cot-extra-${prod.id}" min="0" value="0" oninput="actualizarRecibo()" style="width:70px;">
            </div>
        `;
    });
}

function actualizarRecibo() {
    const nombreCliente = document.getElementById('cot-cliente').value || '---';
    const fechaInput = document.getElementById('cot-fecha').value;
    const anticipo = parseFloat(document.getElementById('cot-anticipo').value) || 0;
    
    document.getElementById('resumen-cliente').innerText = nombreCliente;
    document.getElementById('resumen-fecha').innerText = fechaInput ? fechaInput : 'Sin definir';

    const idPaquete = document.getElementById('cot-paquete').value;
    const divDetalles = document.getElementById('resumen-detalles');
    let total = 0;
    let htmlDetalles = '';

    if (idPaquete) {
        const paqueteSeleccionado = paquetesDB.find(p => p.id == idPaquete);
        if (paqueteSeleccionado) {
            htmlDetalles += `<div class="recibo-item"><span><strong>${paqueteSeleccionado.nombre}</strong></span><span>$${parseFloat(paqueteSeleccionado.precio).toFixed(2)}</span></div>`;
            total += parseFloat(paqueteSeleccionado.precio);
        }
    }

    productosDB.forEach(prod => {
        const inputCantidad = document.getElementById(`cot-extra-${prod.id}`);
        if(!inputCantidad) return;
        const cantidad = parseInt(inputCantidad.value) || 0;
        if (cantidad > 0) {
            const subtotal = cantidad * parseFloat(prod.precio);
            htmlDetalles += `<div class="recibo-item"><span>${cantidad}x ${prod.nombre}</span><span>$${subtotal.toFixed(2)}</span></div>`;
            total += subtotal;
        }
    });

    if (htmlDetalles === '') {
        divDetalles.innerHTML = '<div style="text-align: center; color: var(--texto-claro); font-style: italic; padding: 20px;">Selecciona un paquete o artículos para ver el resumen.</div>';
    } else {
        divDetalles.innerHTML = htmlDetalles;
    }

    let saldoPendiente = total - anticipo;
    if (saldoPendiente < 0) saldoPendiente = 0; 

    document.getElementById('resumen-total').innerText = `$${total.toFixed(2)}`;
    document.getElementById('resumen-anticipo').innerText = `-$${anticipo.toFixed(2)}`;
    document.getElementById('resumen-saldo').innerText = `$${saldoPendiente.toFixed(2)}`;
}

async function guardarCotizacion() {
    const cliente = document.getElementById('cot-cliente').value;
    const totalTexto = document.getElementById('resumen-total').innerText.replace('$', '');
    const total = parseFloat(totalTexto);
    const fecha = document.getElementById('cot-fecha').value || "Pendiente";
    const saldoTexto = document.getElementById('resumen-saldo').innerText.replace('$', '');
    const anticipo = parseFloat(document.getElementById('cot-anticipo').value) || 0;

    if (!cliente || total === 0) return mostrarAlerta("⚠️", "Faltan datos", "Ingresa cliente y artículos.");

    // El estado ahora es 100% automático en base a si abonó el total o no
    let estadoCot = parseFloat(saldoTexto) <= 0 ? "Completado" : "Pendiente";

    try {
        const { error } = await supabaseClient.from('Cotizaciones').insert([{
            cliente: cliente,
            fecha: fecha,
            total: total,
            anticipo: anticipo,
            estado: estadoCot
        }]);
        if (error) throw error;
        
        // ✨ NUEVO: AGREGAR AL CALENDARIO AUTOMÁTICAMENTE
        if (fecha && fecha !== "Pendiente") {
            const idPaquete = document.getElementById('cot-paquete').value;
            let extrasCot = {};
            
            productosDB.forEach(prod => {
                let input = document.getElementById(`cot-extra-${prod.id}`);
                if(input && parseInt(input.value) > 0) extrasCot[prod.id] = parseInt(input.value);
            });

            let eventoFinal = { 
                fecha: fecha, 
                horaInicio: "12:00", 
                horaFin: "18:00", 
                cliente: cliente, 
                paqueteId: idPaquete ? parseInt(idPaquete) : null, 
                extras: extrasCot 
            };
            
            // Lo enviamos a la BD sin detener el flujo principal
            supabaseClient.from('Eventos').insert([eventoFinal]).then(() => console.log('✅ Agendado en calendario automáticamente.'));
        }

        mostrarAlerta("✅", "Guardada", "La cotización fue registrada y agendada en el calendario.");
        
        document.getElementById('cot-cliente').value = '';
        document.getElementById('cot-fecha').value = '';
        document.getElementById('cot-anticipo').value = 0;
        document.getElementById('cot-paquete').value = '';
        productosDB.forEach(prod => {
            let input = document.getElementById(`cot-extra-${prod.id}`);
            if(input) input.value = 0;
        });
        
        actualizarRecibo();
        await cargarDatosDesdeSupabase();
    } catch (error) {
        console.error(error);
        mostrarAlerta("❌", "Error", "No se guardó la cotización.");
    }
}

function renderizarHistorialCotizaciones() {
    const tbody = document.getElementById('tabla-cotizaciones');
    if (!tbody) return;
    
    cotizacionEnEdicion = null; // Reiniciar estado al dibujar la tabla

    // ✨ NUEVO: Inyectar el buscador dinámicamente si no existe
    let buscador = document.getElementById('buscador-cotizaciones');
    if (!buscador) {
        const tableContainer = tbody.closest('.table-container') || tbody.parentElement;
        if (tableContainer) {
            const buscadorHTML = `
                <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2rem;">🔍</span>
                    <input type="text" id="buscador-cotizaciones" placeholder="Buscar por ID o Nombre de cliente..." 
                        style="padding: 12px; border-radius: 10px; border: 1.5px solid var(--borde); width: 100%; max-width: 400px; font-family: inherit;"
                        oninput="renderizarHistorialCotizaciones()">
                </div>
            `;
            tableContainer.insertAdjacentHTML('beforebegin', buscadorHTML);
            buscador = document.getElementById('buscador-cotizaciones');
        }
    }

    tbody.innerHTML = '';

    let cotizacionesAMostrar = cotizacionesDB;
    if (buscador && buscador.value.trim() !== "") {
        const busqueda = buscador.value.trim().toLowerCase();
        cotizacionesAMostrar = cotizacionesAMostrar.filter(cot => 
            cot.id.toString().includes(busqueda) || 
            (cot.cliente && cot.cliente.toLowerCase().includes(busqueda))
        );
    }

    if (cotizacionesAMostrar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--texto-claro);">No se encontraron cotizaciones.</td></tr>`;
        return;
    }

    cotizacionesAMostrar.forEach(cot => {
        let anticipo = cot.anticipo || 0;
        let saldo = cot.total - anticipo;
        let estadoReal = saldo <= 0 ? "Completado" : "Pendiente";
        let colorEstado = saldo <= 0 ? "color: #4A5D54; font-weight:bold;" : "color: #D4A373; font-weight:bold;";
        
        tbody.innerHTML += `
            <tr>
                <td>#${cot.id}</td>
                <td style="font-weight:600;">
                    <span id="span-cot-cliente-${cot.id}">${cot.cliente}</span>
                    <input type="text" id="input-cot-cliente-${cot.id}" value="${cot.cliente}" style="display:none; padding:8px; border-radius:8px; border:1px solid var(--borde); width:90%; font-family:inherit;">
                </td>
                <td>
                    <span id="span-cot-fecha-${cot.id}">${cot.fecha}</span>
                    <input type="date" id="input-cot-fecha-${cot.id}" value="${cot.fecha}" style="display:none; padding:8px; border-radius:8px; border:1px solid var(--borde); width:90%; font-family:inherit;">
                </td>
                <td>
                    <div id="vista-montos-${cot.id}">
                        Total: $<span id="span-cot-total-${cot.id}">${parseFloat(cot.total).toFixed(2)}</span><br>
                        <small style="color:var(--primario)">Abono: $${parseFloat(anticipo).toFixed(2)}</small><br>
                        <small style="color:#DC2626; font-weight:bold;">Resta: $${parseFloat(saldo).toFixed(2)}</small>
                    </div>
                    <div id="edicion-montos-${cot.id}" style="display:none; margin-top:5px; flex-direction:column; gap:5px;">
                        <div style="font-size: 0.85rem; margin-bottom: 3px; color: var(--primario);">Total: <strong>$${parseFloat(cot.total).toFixed(2)}</strong><br>Ya abonado: <strong>$${parseFloat(anticipo).toFixed(2)}</strong></div>
                        <input type="number" id="input-cot-anticipo-${cot.id}" value="" placeholder="+ Agregar Abono ($)" style="padding:6px; border-radius:6px; border:1px solid var(--borde); font-family:inherit;" title="Ingresa un nuevo abono para sumarlo">
                    </div>
                </td>
                <td style="${colorEstado}">
                    ${estadoReal}
                </td>
                <td>
                    <button class="btn-icon" id="btn-edit-cot-${cot.id}" onclick="habilitarEdicionCotizacion(${cot.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="imprimirReciboHistorial(${cot.id})" title="Imprimir Recibo de Abono">🖨️</button>
                    <button class="btn-icon" id="btn-save-cot-${cot.id}" onclick="guardarEdicionCotizacion(${cot.id})" title="Guardar" style="display:none;">💾</button>
                    <button class="btn-icon" id="btn-cancel-cot-${cot.id}" onclick="cancelarEdicionCotizacion(${cot.id})" title="Cancelar" style="display:none; color: #DC2626;">✖️</button>
                    <button class="btn-icon" onclick="eliminarCotizacion(${cot.id})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function habilitarEdicionCotizacion(id) {
    if (cotizacionEnEdicion !== null && cotizacionEnEdicion !== id) {
        return mostrarAlerta("⚠️", "Edición en curso", "Termina de guardar o cancelar la cotización actual antes de modificar otra.");
    }
    cotizacionEnEdicion = id;

    document.getElementById(`span-cot-cliente-${id}`).style.display = 'none';
    document.getElementById(`input-cot-cliente-${id}`).style.display = 'inline-block';
    
    document.getElementById(`span-cot-fecha-${id}`).style.display = 'none';
    document.getElementById(`input-cot-fecha-${id}`).style.display = 'inline-block';
    
    document.getElementById(`vista-montos-${id}`).style.display = 'none';
    document.getElementById(`edicion-montos-${id}`).style.display = 'flex';
    
    document.getElementById(`btn-edit-cot-${id}`).style.display = 'none';
    document.getElementById(`btn-save-cot-${id}`).style.display = 'inline-block';
    document.getElementById(`btn-cancel-cot-${id}`).style.display = 'inline-block';
}

function cancelarEdicionCotizacion(id) {
    cotizacionEnEdicion = null;
    renderizarHistorialCotizaciones(); // Refresca la tabla para ocultar los inputs
}

async function guardarEdicionCotizacion(id) {
    const nuevoCliente = document.getElementById(`input-cot-cliente-${id}`).value;
    const nuevaFecha = document.getElementById(`input-cot-fecha-${id}`).value;
    const abonoIngresado = parseFloat(document.getElementById(`input-cot-anticipo-${id}`).value) || 0;

    if (!nuevoCliente) {
        return mostrarAlerta("⚠️", "Datos inválidos", "Asegúrate de ingresar un nombre válido.");
    }
    
    const cotizacionActual = cotizacionesDB.find(c => c.id === id);
    
    // ✨ MAGIA: Sumar el nuevo pago al abono que ya tenía registrado
    const nuevoAnticipoTotal = (cotizacionActual.anticipo || 0) + abonoIngresado;
    const nuevoEstado = nuevoAnticipoTotal >= cotizacionActual.total ? "Completado" : "Pendiente";

    try {
        const { error } = await supabaseClient.from('Cotizaciones').update({
            cliente: nuevoCliente,
            fecha: nuevaFecha,
            anticipo: nuevoAnticipoTotal,
            estado: nuevoEstado
        }).eq('id', id);

        if (error) throw error;
        
        cotizacionEnEdicion = null;
        mostrarAlerta("✅", "Actualizado", "Abonos y estados actualizados exitosamente.");
        await cargarDatosDesdeSupabase();
    } catch (error) {
        console.error("Error al actualizar cotización:", error);
        mostrarAlerta("❌", "Error al guardar", "No se pudieron guardar los cambios.");
    }
}

// ✨ NUEVO: Imprime el recibo desde el historial
function imprimirReciboHistorial(id) {
    const cot = cotizacionesDB.find(c => c.id === id);
    if (!cot) return;
    
    let anticipo = cot.anticipo || 0;
    let saldo = cot.total - anticipo;

    document.getElementById('resumen-cliente').innerText = cot.cliente;
    document.getElementById('resumen-fecha').innerText = cot.fecha || 'Sin definir';
    
    let htmlDetalles = `<div class="recibo-item" style="margin-bottom: 15px;"><span><strong>Cotización / Recibo #${cot.id}</strong></span><span></span></div>`;
    htmlDetalles += `<div class="recibo-item"><span>Estado del Pago:</span><span style="font-weight:bold;">${saldo <= 0 ? "Completado" : "Pendiente"}</span></div>`;
    
    document.getElementById('resumen-detalles').innerHTML = htmlDetalles;
    document.getElementById('resumen-total').innerText = `$${parseFloat(cot.total).toFixed(2)}`;
    document.getElementById('resumen-anticipo').innerText = `-$${parseFloat(anticipo).toFixed(2)}`;
    document.getElementById('resumen-saldo').innerText = `$${parseFloat(saldo).toFixed(2)}`;

    window.print();

    setTimeout(() => { if (typeof actualizarRecibo === 'function') actualizarRecibo(); }, 1500);
}

async function eliminarCotizacion(id) {
    if(confirm(`¿Estás seguro de eliminar la cotización #${id}?`)) {
        try {
            const { error } = await supabaseClient.from('Cotizaciones').delete().eq('id', id);
            if (error) throw error;
            mostrarAlerta("🗑️", "Eliminada", "Cotización borrada de Supabase.");
            await cargarDatosDesdeSupabase();
        } catch (error) {
            console.error(error);
            mostrarAlerta("❌", "Error", "No se eliminó la cotización.");
        }
    }
}

// ==========================================
// 7. INICIALIZADOR PRINCIPAL (DOM LOADED)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    verificarAcceso();
    aplicarPermisos();

    // ✨ NUEVO: Cerrar resultados del buscador de calendario si das clic afuera
    document.addEventListener('click', (e) => {
        const resultadosBox = document.getElementById('resultados-busqueda-eventos');
        const buscadorInput = document.getElementById('buscador-eventos');
        if (resultadosBox && resultadosBox.style.display === 'block') {
            if (!resultadosBox.contains(e.target) && e.target !== buscadorInput) {
                resultadosBox.style.display = 'none';
            }
        }
    });

    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); 
            const userIn = document.getElementById('usuario').value.trim();
            const passIn = document.getElementById('password').value.trim();
            const btnIngresar = document.getElementById('btnIngresar');
            
            btnIngresar.innerText = "Verificando...";
            
            try {
                // Descargamos todos los usuarios para verificarlos de forma local y segura
                let { data: usuarios, error } = await supabaseClient
                    .from('Usuarios')
                    .select('*');

                if (error) {
                    // Intento de respaldo por si la tabla se guardó como 'usuarios' (minúsculas)
                    const fallback = await supabaseClient.from('usuarios').select('*');
                    if (!fallback.error) usuarios = fallback.data;
                    else throw error;
                }

                // 🛠️ Imprime en consola lo que hay en tu base de datos (¡Revisa esto!)
                console.log("🕵️ Datos en Supabase:", usuarios);

                let usuario = usuarios ? usuarios.find(u => 
                    ((u.rol && u.rol.toLowerCase() === userIn.toLowerCase()) || 
                     (u.nombre_usuario && u.nombre_usuario.toLowerCase() === userIn.toLowerCase())) &&
                    String(u.password_hash) === passIn
                ) : null;

                if (usuario) {
                    localStorage.setItem('rolUsuario', usuario.rol);
                    localStorage.setItem('nombreUsuario', usuario.nombre_usuario);
                    
                    const overlay = document.getElementById('welcome-overlay');
                    if (overlay) {
                        document.getElementById('welcome-user').innerText = usuario.nombre_usuario;
                        document.getElementById('welcome-role').innerText = usuario.rol;
                        overlay.style.display = 'flex';
                        setTimeout(() => window.location.href = "menu.html", 2000);
                    } else {
                        window.location.href = "menu.html"; 
                    }
                } else {
                    mostrarAlerta("🚫", "Acceso Denegado", "El tipo de usuario o contraseña son incorrectos.");
                    btnIngresar.innerText = "Ingresar al Sistema";
                }
            } catch (error) {
                mostrarAlerta("⚠️", "Error de red", "No se pudo conectar con la base de datos.");
                btnIngresar.innerText = "Ingresar al Sistema";
                console.error(error);
            }
        });
    }

    if (document.getElementById('calendario-js')) { 
        cargarDatosDesdeSupabase(); // <--- Descarga los datos reales justo antes de pintar la pantalla
        renderizarCalendario(); 
        cargarDatosDashboard(); 
        
        // Puedes conservar cargarPaquetesSelect si aún usas el select normal por debajo
        if(typeof cargarPaquetesSelect === "function") {
            // Genera los options ocultos para mantener la compatibilidad
            const select = document.getElementById('ev-paquete');
            if (select) {
                select.innerHTML = '<option value="">-- Selecciona un paquete --</option>';
                paquetesDB.forEach(paq => select.innerHTML += `<option value="${paq.id}">${paq.nombre}</option>`);
            }
        }
    }
});