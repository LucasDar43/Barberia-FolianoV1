// ============================================
// BARBERIA FOLIANO'S - SISTEMA V1 Produccion
// ============================================

// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    setDoc,
    query,
    orderBy,
    onSnapshot,
    where,
    Timestamp,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyBoYWlsZJnirTMSiggkcugBNzWns1W3TTg",
    authDomain: "barberia-folianosv1.firebaseapp.com",
    projectId: "barberia-folianosv1",
    storageBucket: "barberia-folianosv1.firebasestorage.app",
    messagingSenderId: "601248328135",
    appId: "1:601248328135:web:9bf521a49a73e1f45e51e2"
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getFirestore(appFirebase);

// Exportar db para extensiones.js
export { db };

// ===================================================
// ================= CLASE PRINCIPAL =================
// ===================================================

class BarberiaSystem {

    constructor(user) {
        this.currentUser = user.uid;
        this.userEmail = user.email;
        this.userName = null;
        this.userRole = null;

        this.cortes = [];
        this.deudas = [];
        this.cierres = [];
        this.ventas = [];
        this.solicitudes = [];
        this.pagosNacho = [];

        this.config = {
            precioSoloCorte: 9000,
            precioCorteBarba: 12000,
            precioCorteNino: 7000,
            usarPreciosFijos: false
        };

        this.porcentajeNacho = 60;
        this.porcentajeFranco = 40;

        this.currentPage = 'dashboard';
        this.currentDeudaId = null;
        this.currentSolicitudId = null;
        this.currentCorteToDelete = null;

        this.unsubscribeCortes = null;
        this.unsubscribeDeudas = null;
        this.unsubscribeCierres = null;
        this.unsubscribeSolicitudes = null;

        console.log('🚀 Sistema Barbería Foliano\'s v1.0 iniciando...');
        console.log('APP VERSION: 2026-03-01');

        this.init();
    }

    async init() {
        try {
            await this.cargarPerfilUsuario();
            await this.cargarConfiguracion();

            await this.cargarCortes();
            await this.cargarDeudas();
            await this.cargarCierres();
            await this.cargarSolicitudes();
            await this.cargarPagosNacho();

            this.setupEventListeners();
            this.updateUserName();
            this.updateDate();

            this.iniciarListenersFirestore();
            this.updateDashboard();

            if (this.userRole === 'admin') {
                this.actualizarBadgeSolicitudes();
            }

            setTimeout(() => {
                this.aplicarRestriccionesRol();
                this.navigateTo('registro');
            }, 50);

            console.log('✅ Sistema iniciado correctamente -', this.userName, `(${this.userRole})`);
        } catch (error) {
            console.error('❌ ERROR AL INICIALIZAR:', error);
            alert('Error al cargar el sistema. Por favor recarga la pagina.');
        }
    }

    // ==================== CARGAR DATOS ====================

    async cargarPerfilUsuario() {
        const ref = doc(db, "users", this.currentUser);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            alert("Usuario no registrado");
            throw new Error("Usuario sin perfil");
        }
        const data = snap.data();
        this.userName = data.name;
        this.userRole = data.role;

        document.body.setAttribute('data-role', this.userRole);
        console.log('👤 Rol asignado al body:', this.userRole);

        setTimeout(() => {
            const el = document.getElementById('currentUserName');
            if (el) el.textContent = this.userName;
        }, 0);
    }

    async cargarConfiguracion() {
        try {
            const docRef = doc(db, 'configuracion', 'precios');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                this.config = docSnap.data();
            } else {
                await setDoc(docRef, this.config);
            }
        } catch (error) {
            console.error('Error cargando configuracion:', error);
        }
    }

    async cargarCortes() {
        const q = query(collection(db, 'cortes'), orderBy('fecha', 'desc'));
        const snapshot = await getDocs(q);
        this.cortes = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
    }

    async cargarDeudas() {
        const snapshot = await getDocs(collection(db, 'deudas'));
        this.deudas = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
    }

    async cargarCierres() {
        const q = query(collection(db, 'cierres'), orderBy('fecha', 'desc'));
        const snapshot = await getDocs(q);
        this.cierres = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
    }

    async cargarSolicitudes() {
        try {
            const snap = await getDocs(collection(db, 'solicitudes'));
            this.solicitudes = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(s => s && s.estado);
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            this.solicitudes = [];
        }
    }

    // ==================== LISTENERS FIRESTORE ====================

    iniciarListenersFirestore() {
        const cortesRef = collection(db, 'cortes');
        const qCortes = query(cortesRef, orderBy('fecha', 'desc'));

        this.unsubscribeCortes = onSnapshot(qCortes, (snapshot) => {
            this.cortes = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            this.updateDashboard();
            if (this.currentPage === 'historial') this.renderHistorial();
            console.log('📊 Dashboard actualizado -', snapshot.docs.length, 'cortes en total');
        }, (error) => {
            console.error('❌ Error en listener de cortes:', error);
        });

        this.unsubscribeDeudas = onSnapshot(collection(db, 'deudas'), (snapshot) => {
            this.deudas = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            if (this.currentPage === 'deudores') this.renderDeudores();
        }, (error) => {
            console.error('❌ Error en listener de deudas:', error);
        });

        const qCierres = query(collection(db, 'cierres'), orderBy('fecha', 'desc'));
        this.unsubscribeCierres = onSnapshot(qCierres, (snapshot) => {
            this.cierres = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            if (this.currentPage === 'cierre' && typeof this.renderCierre === 'function') {
                this.renderCierre();
            }
        }, (error) => {
            console.error('❌ Error en listener de cierres:', error);
        });

        const qVentas = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));
        this.unsubscribeVentas = onSnapshot(qVentas, (snapshot) => {
            this.ventas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (this.currentPage === 'cierre' && typeof this.renderCierre === 'function') {
                this.renderCierre();
            }
        }, (error) => {
            console.error('Error en listener de ventas:', error);
        });

        this.unsubscribeSolicitudes = onSnapshot(collection(db, 'solicitudes'), (snapshot) => {
            this.solicitudes = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            if (this.userRole === 'admin') this.actualizarBadgeSolicitudes();
            if (this.currentPage === 'solicitudes') this.renderSolicitudes();
        }, (error) => {
            console.error('❌ Error en listener de solicitudes:', error);
        });

        const qBonos = query(collection(db, 'bonos'), orderBy('fechaCompra', 'desc'));
        this.unsubscribeBonos = onSnapshot(qBonos, (snapshot) => {
            this.bonos = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            if (this.currentPage === 'bonos') this.renderBonos();
        }, (error) => {
            console.error('Error en listener de bonos:', error);
        });
    }

    // ==================== RESTRICCIONES ====================


    aplicarRestriccionesRol() {
    console.log('🔒 APLICANDO RESTRICCIONES - Rol:', this.userRole);

        if (this.userRole !== 'admin') {
            console.log('👤 Usuario es peluquero, removiendo elementos...');

            // Remover todos los elementos usando querySelector
            document.querySelector('[data-page="dashboard"]')?.remove();
            document.getElementById('cierreNav')?.remove();
            document.getElementById('comisionesNav')?.remove();
            document.getElementById('solicitudesNav')?.remove();
            document.querySelector('[data-page="configuracion"]')?.remove();

            console.log('✅ Elementos de admin removidos');
    }
}


    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        document.querySelectorAll('input[name="metodoPago"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.togglePagoMixto(e.target.value));
        });

        ['montoEfectivo', 'montoTransferencia'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                this.calcularTotalMixto();
                this.actualizarResumenTotal();
            });
        });

        document.getElementById('monto')?.addEventListener('input', () => this.actualizarResumenTotal());
        document.getElementById('montoProducto')?.addEventListener('input', () => this.actualizarResumenTotal());

        document.querySelectorAll('input[name="metodoPago"]').forEach(radio => {
            radio.addEventListener('change', () => this.actualizarResumenTotal());
        });

        document.getElementById('esDeuda')?.addEventListener('change', (e) => {
            document.getElementById('deudaFields').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('tipoCorte')?.addEventListener('change', () => this.autocompletarPrecio());


        document.addEventListener('submit', (e) => {
            if (e.target && e.target.id === 'corteForm') {
                e.preventDefault();
                window.app.registrarCorte();
            }
        });

        document.getElementById('configForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarConfiguracion();
        });

        document.getElementById('filtroFecha')?.addEventListener('change', () => this.renderHistorial());
        document.getElementById('filtroPeluquero')?.addEventListener('change', () => this.renderHistorial());
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });

        document.getElementById('buscarBono')?.addEventListener('input', (e) => {
            this.filtrarBonos(e.target.value);
        });
    }


    // ==================== NAVEGACION ====================

    navigateTo(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) item.classList.add('active');
        });

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`)?.classList.add('active');

        const titles = {
            dashboard: 'Dashboard', 
            registro: 'Nuevo Corte', 
            deudores: 'Deudores',
            cierre: 'Cierre de Caja', 
            historial: 'Historial',
            configuracion: 'Configuracion',
            comisiones: 'Comisiones', 
            solicitudes: 'Solicitudes Pendientes'
        };

        const titleElement = document.getElementById('pageTitle');
        if (titleElement) titleElement.textContent = titles[page] || page;

        if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('active');
        }

        this.currentPage = page;

        if (page === 'dashboard') this.updateDashboard();
        else if (page === 'registro') this.setupRegistroPage();
        else if (page === 'historial') this.renderHistorial();
        else if (page === 'deudores') this.renderDeudores();
        else if (page === 'configuracion') this.cargarConfiguracionUI();
        else if (page === 'cierre' && typeof this.renderCierre === 'function') this.renderCierre();
        else if (page === 'comisiones') this.renderComisiones();
        else if (page === 'solicitudes') this.renderSolicitudes();
        else if (page === 'bonos') this.renderBonos();
    }

    // ==================== SETUP REGISTRO PAGE ====================

    setupRegistroPage() {
        this.autocompletarPrecio();

        const tipoCorteSelect = document.getElementById('tipoCorte');
        if (tipoCorteSelect) {
            tipoCorteSelect.removeEventListener('change', this.autocompletarPrecioHandler);

            this.autocompletarPrecioHandler = () => this.autocompletarPrecio();

            tipoCorteSelect.addEventListener('change', this.autocompletarPrecioHandler);
        }

        if (this.userRole === 'peluquero') {
            const peluqueroSelect = document.getElementById('peluquero');
            if (peluqueroSelect) {
                peluqueroSelect.value = 'nacho';
                peluqueroSelect.disabled = true;
            }

            const montoInput = document.getElementById('monto');
            if (montoInput && this.config.usarPreciosFijos) {
                montoInput.readOnly = true;
                montoInput.style.backgroundColor = '#f3f4f6';
                montoInput.style.cursor = 'not-allowed';
                montoInput.title = 'El precio es fijo y no se puede modificar';
            }
          }
        }

        toggleVentaProducto() {
            const checked = document.getElementById('tieneVentaProducto')?.checked;
            const fields = document.getElementById('ventaProductoFields');
            if (fields) fields.style.display = checked ? 'block' : 'none';
            this.actualizarResumenTotal();
        }

        actualizarResumenTotal() {
            const tieneVenta = document.getElementById('tieneVentaProducto')?.checked;
            const resumen = document.getElementById('resumenTotal');
            if (!resumen) return;

            const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value;
            let montoCorte = 0;
            if (metodoPago === 'mixto') {
                const ef = parseFloat(document.getElementById('montoEfectivo')?.value) || 0;
                const tr = parseFloat(document.getElementById('montoTransferencia')?.value) || 0;
                montoCorte = ef + tr;
            } else {
                montoCorte = parseFloat(document.getElementById('monto')?.value) || 0;
            }
            const montoProducto = tieneVenta ? (parseFloat(document.getElementById('montoProducto')?.value) || 0) : 0;

            if (tieneVenta && (montoCorte > 0 || montoProducto > 0)) {
                resumen.style.display = 'block';
                document.getElementById('resumenMonto').textContent = this.formatCurrency(montoCorte);
                document.getElementById('resumenProducto').textContent = this.formatCurrency(montoProducto);
                document.getElementById('resumenTotalMonto').textContent = this.formatCurrency(montoCorte + montoProducto);
            } else {
                resumen.style.display = 'none';
            }
        }


        // ==================== DASHBOARD ====================

        poblarSelectorMes() {
            const select = document.getElementById('filtroDashboardMes');
            if (!select) return;

            // Obtener todos los meses únicos con datos en this.cortes
            const mesesConDatos = new Set();
            this.cortes.forEach(c => {
                if (!c.fecha) return;
                const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                mesesConDatos.add(key);
            });

            const hoy = new Date();
            const mesActualKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

            // Siempre incluir el mes actual aunque no tenga datos
            mesesConDatos.add(mesActualKey);

            // Ordenar de más reciente a más antiguo
            const mesesOrdenados = Array.from(mesesConDatos).sort((a, b) => b.localeCompare(a));

            const nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

            const valorActual = select.value || mesActualKey;

            select.innerHTML = mesesOrdenados.map(key => {
                const [anio, mes] = key.split('-');
                const nombre = `${nombresMeses[parseInt(mes) - 1]} ${anio}`;
                const selected = key === valorActual ? 'selected' : '';
                return `<option value="${key}" ${selected}>${nombre}</option>`;
            }).join('');

            // Listener (solo agregar una vez)
            if (!select._listenerAgregado) {
                select.addEventListener('change', () => this.updateDashboard());
                select._listenerAgregado = true;
            }
        }

        updateDashboard() {
            const hoy = new Date();

            // Determinar el mes seleccionado
            const select = document.getElementById('filtroDashboardMes');
            let anioSel = hoy.getFullYear();
            let mesSel = hoy.getMonth(); // 0-indexed

            if (select && select.value) {
                const [a, m] = select.value.split('-');
                anioSel = parseInt(a);
                mesSel = parseInt(m) - 1;
            }

            const esMesActual = (anioSel === hoy.getFullYear() && mesSel === hoy.getMonth());

            const inicioMesSel = new Date(anioSel, mesSel, 1);
            const finMesSel = new Date(anioSel, mesSel + 1, 0, 23, 59, 59, 999);

            // Poblar el selector con los meses disponibles
            this.poblarSelectorMes();

            const nombresMeses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const etiquetaMes = `${nombresMeses[mesSel]} ${anioSel}`;

            // Actualizar títulos de cards
            const tituloRendimiento = document.getElementById('tituloRendimientoPeluquero');
            const tituloMetodos = document.getElementById('tituloMetodosPago');
            if (tituloRendimiento) tituloRendimiento.textContent = `Rendimiento por Peluquero - ${esMesActual ? 'Hoy' : etiquetaMes}`;
            if (tituloMetodos) tituloMetodos.textContent = `Métodos de Pago - ${esMesActual ? 'Hoy' : etiquetaMes}`;

            // Filtrar cortes
            let cortesHoy = [];
            let cortesMes = [];

            if (this.userRole === 'peluquero') {
                const nombre = (this.userName || '').toLowerCase();

                cortesHoy = esMesActual ? this.cortes.filter(c => {
                    if (!c.fecha) return false;
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return this.isSameDay(fecha, hoy) && (c.peluquero || '').toLowerCase() === nombre;
                }) : [];

                cortesMes = this.cortes.filter(c => {
                    if (!c.fecha) return false;
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return fecha >= inicioMesSel && fecha <= finMesSel && (c.peluquero || '').toLowerCase() === nombre;
                });

            } else {
                cortesHoy = esMesActual ? this.cortes.filter(c => {
                    if (!c.fecha) return false;
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return this.isSameDay(fecha, hoy);
                }) : [];

                cortesMes = this.cortes.filter(c => {
                    if (!c.fecha) return false;
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return fecha >= inicioMesSel && fecha <= finMesSel;
                });
            }

            const totalHoy = cortesHoy.reduce((sum, c) => sum + (c.monto || 0), 0);
            const totalMes = cortesMes.reduce((sum, c) => sum + (c.monto || 0), 0);

            const elemTotalHoy = document.getElementById('totalHoy');
            const elemTotalMes = document.getElementById('totalMes');
            const elemCortesHoy = document.getElementById('cortesHoy');
            const elemCortesMes = document.getElementById('cortesMes');

            if (elemTotalHoy) elemTotalHoy.textContent = esMesActual ? this.formatCurrency(totalHoy) : '-';
            if (elemTotalMes) elemTotalMes.textContent = this.formatCurrency(totalMes);
            if (elemCortesHoy) elemCortesHoy.textContent = esMesActual ? cortesHoy.length : '-';
            if (elemCortesMes) elemCortesMes.textContent = cortesMes.length;

            // Las cards de rendimiento y métodos de pago muestran:
            // - Si es mes actual: datos de HOY
            // - Si es mes anterior: datos del MES completo
            const cortesParaCards = esMesActual ? cortesHoy : cortesMes;

            this.updatePeluquerosHoy(cortesParaCards);
            this.updateMetodosPagoHoy(cortesParaCards);
            this.renderRecentCuts();
        }


    updatePeluquerosHoy(cortesHoy) {
        const peluqueros = this.userRole === 'peluquero' ? ['nacho'] : ['franco', 'nacho'];

        peluqueros.forEach(p => {
            const cortesP = cortesHoy.filter(c => (c.peluquero || '').toLowerCase() === p);
            const total = cortesP.reduce((sum, c) => sum + (c.monto || 0), 0);
            const promedio = cortesP.length > 0 ? total / cortesP.length : 0;

            const nombreCapitalizado = this.getNombrePeluquero(p);
            
            const elemTotal = document.getElementById(`total${nombreCapitalizado}Hoy`);
            const elemCortes = document.getElementById(`cortes${nombreCapitalizado}Hoy`);
            const elemPromedio = document.getElementById(`promedio${nombreCapitalizado}Hoy`);

            if (elemTotal) elemTotal.textContent = this.formatCurrency(total);
            if (elemCortes) elemCortes.textContent = cortesP.length;
            if (elemPromedio) elemPromedio.textContent = this.formatCurrency(promedio);
        });
    }

    updateMetodosPagoHoy(cortesHoy) {
        const efectivo = cortesHoy.reduce((sum, c) => sum + (c.montoEfectivo || 0), 0);
        const transferencia = cortesHoy.reduce((sum, c) => sum + (c.montoTransferencia || 0), 0);
        const mixto = cortesHoy.filter(c => c.metodoPago === 'mixto').reduce((sum, c) => sum + (c.monto || 0), 0);

        const elemEfectivo = document.getElementById('efectivoHoy');
        const elemTransferencia = document.getElementById('transferenciaHoy');
        const elemMixto = document.getElementById('mixtoHoy');

        if (elemEfectivo) elemEfectivo.textContent = this.formatCurrency(efectivo);
        if (elemTransferencia) elemTransferencia.textContent = this.formatCurrency(transferencia);
        if (elemMixto) elemMixto.textContent = this.formatCurrency(mixto);
    }

    renderRecentCuts() {
        const container = document.getElementById('recentCuts');
        if (!container) return;

        const ultimos = this.cortes.slice(0, 5);

        if (ultimos.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay cortes registrados aun</p>';
            return;
        }

        container.innerHTML = ultimos.map(c => `
            <div class="cut-item">
                <div class="cut-info">
                    <div class="cut-header">${c.cliente || 'Sin nombre'} - ${this.getNombrePeluquero(c.peluquero)}</div>
                    <div class="cut-details">
                        ${this.formatDate(c.fecha)} - ${this.getNombreTipo(c.tipoCorte)} - ${this.getNombreMetodo(c.metodoPago)}
                    </div>
                </div>
                <div class="cut-amount">${this.formatCurrency(c.monto)}</div>
            </div>
        `).join('');
    }

    togglePagoMixto(metodo) {
        const mixtoFields = document.getElementById('pagoMixtoFields');
        const montoSimple = document.getElementById('montoSimpleField');

        if (metodo === 'mixto') {
            if (mixtoFields) mixtoFields.style.display = 'block';
            if (montoSimple) montoSimple.style.display = 'none';
        } else {
            if (mixtoFields) mixtoFields.style.display = 'none';
            if (montoSimple) montoSimple.style.display = 'block';
        }
        this.actualizarResumenTotal();
    }

    calcularTotalMixto() {
        const efectivo = parseFloat(document.getElementById('montoEfectivo')?.value) || 0;
        const transferencia = parseFloat(document.getElementById('montoTransferencia')?.value) || 0;
        return efectivo + transferencia;
    }

    autocompletarPrecio() {
        const tipoCorte = document.getElementById('tipoCorte')?.value;
        const montoInput = document.getElementById('monto');

        console.log('🔄 Autocompletando precio...');
        console.log('  - Tipo de corte:', tipoCorte);
        console.log('  - Usar precios fijos:', this.config.usarPreciosFijos);

        if (this.config.usarPreciosFijos && montoInput && tipoCorte) {
            let precio = 0;
            
            if (tipoCorte === 'solo-corte') {
                            precio = this.config.precioSoloCorte;
                        } else if (tipoCorte === 'corte-barba') {
                            precio = this.config.precioCorteBarba;
                        } else if (tipoCorte === 'corte-nino') {
                            precio = this.config.precioCorteNino;
                        }
            
            if (precio > 0) {
                montoInput.value = precio;
                console.log('✅ Precio autocompletado:', precio);
            } else {
                console.log('⚠️ No se pudo determinar el precio para:', tipoCorte);
            }
        } else {
            console.log('ℹ️ No se autocompleta porque:');
            if (!this.config.usarPreciosFijos) console.log('  - Precios fijos desactivados');
            if (!montoInput) console.log('  - Input de monto no encontrado');
            if (!tipoCorte) console.log('  - Tipo de corte no seleccionado');
        }
    }

    toggleVentaProducto() {
        const checked = document.getElementById('tieneVentaProducto')?.checked;
        const fields = document.getElementById('ventaProductoFields');
        if (fields) fields.style.display = checked ? 'block' : 'none';
        this.actualizarResumenTotal();
    }

    actualizarResumenTotal() {
        const tieneVenta = document.getElementById('tieneVentaProducto')?.checked;
        const resumen = document.getElementById('resumenTotal');
        if (!resumen) return;

        const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value;
        let montoCorte = 0;
        if (metodoPago === 'mixto') {
            const ef = parseFloat(document.getElementById('montoEfectivo')?.value) || 0;
            const tr = parseFloat(document.getElementById('montoTransferencia')?.value) || 0;
            montoCorte = ef + tr;
        } else {
            montoCorte = parseFloat(document.getElementById('monto')?.value) || 0;
        }
        const montoProducto = tieneVenta ? (parseFloat(document.getElementById('montoProducto')?.value) || 0) : 0;

        if (tieneVenta && (montoCorte > 0 || montoProducto > 0)) {
            resumen.style.display = 'block';
            document.getElementById('resumenMonto').textContent = this.formatCurrency(montoCorte);
            document.getElementById('resumenProducto').textContent = this.formatCurrency(montoProducto);
            document.getElementById('resumenTotalMonto').textContent = this.formatCurrency(montoCorte + montoProducto);
        } else {
            resumen.style.display = 'none';
        }
    }

    async registrarCorte() {

        const peluquero = document.getElementById('peluquero')?.value;
        const tipoCorte = document.getElementById('tipoCorte')?.value;
        const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value;
        const cliente = document.getElementById('cliente')?.value.trim() || 'Sin nombre';
        const esDeuda = document.getElementById('esDeuda')?.checked;

        if (!this.config) {
            console.error('CONFIG NO CARGADA TODAVIA');
            this.showToast('Error: configuracion no cargada', 'error');
            return;
        }

        if (!peluquero || !tipoCorte || !metodoPago) {
            this.showToast('Complete todos los campos', 'error');
            return;
        }

        let monto, montoEfectivo = 0, montoTransferencia = 0;

        if (metodoPago === 'mixto') {
            montoEfectivo = parseFloat(document.getElementById('montoEfectivo')?.value) || 0;
            montoTransferencia = parseFloat(document.getElementById('montoTransferencia')?.value) || 0;
            monto = montoEfectivo + montoTransferencia;
            if (monto <= 0) {
                this.showToast('Ingrese montos validos', 'error');
                return;
            }
        } else {
            if (this.config.usarPreciosFijos) {
                monto = this.calcularPrecio(tipoCorte);
            } else {
                monto = parseFloat(document.getElementById('monto')?.value);
            }

            if (!monto || monto <= 0) {
                this.showToast('Ingrese un monto valido', 'error');
                return;
            }
            
            montoEfectivo = metodoPago === 'efectivo' ? monto : 0;
            montoTransferencia = metodoPago === 'transferencia' ? monto : 0;
        }

        const corte = {
            fecha: Timestamp.now(),
            peluquero,
            tipoCorte,
            metodoPago,
            monto,
            montoEfectivo,
            montoTransferencia,
            cliente,
            registradoPor: this.userName
        };

        // Leer datos de venta de producto
                const tieneVentaProducto = document.getElementById('tieneVentaProducto')?.checked;
                const descripcionProducto = document.getElementById('descripcionProducto')?.value?.trim() || '';
                const montoProducto = tieneVentaProducto ? (parseFloat(document.getElementById('montoProducto')?.value) || 0) : 0;

                if (tieneVentaProducto) {
                    if (!descripcionProducto) {
                        this.showToast('Ingrese la descripcion del producto', 'error');
                        return;
                    }
                    if (montoProducto <= 0) {
                        this.showToast('Ingrese un monto valido para el producto', 'error');
                        return;
                    }
                }

        try {
            if (esDeuda) {
                const montoPagado = parseFloat(document.getElementById('montoPagado')?.value) || 0;
                const montoDeuda = monto - montoPagado;

                if (montoDeuda > 0) {
                    await addDoc(collection(db, 'deudas'), {
                        cliente,
                        fecha: Timestamp.now(),
                        peluquero,
                        tipoCorte,
                        montoTotal: monto,
                        montoPagado,
                        montoDebe: montoDeuda,
                        registradoPor: this.userName
                    });
                }

                if (montoPagado > 0) {
                    corte.monto = montoPagado;
                    corte.esDeuda = true;
                    await addDoc(collection(db, 'cortes'), corte);
                }
            } else {
                await addDoc(collection(db, 'cortes'), corte);
            }

            // Guardar venta de producto por separado
                        if (tieneVentaProducto && montoProducto > 0) {
                            await addDoc(collection(db, 'ventas'), {
                                fecha: Timestamp.now(),
                                peluquero,
                                cliente,
                                descripcion: descripcionProducto,
                                monto: montoProducto,
                                metodoPago,
                                montoEfectivo: metodoPago === 'efectivo' ? montoProducto : (metodoPago === 'mixto' ? montoProducto : 0),
                                montoTransferencia: metodoPago === 'transferencia' ? montoProducto : 0,
                                registradoPor: this.userName
                            });
                        }

            document.getElementById('corteForm')?.reset();
            
            // Si es peluquero, restaurar su nombre después del reset
            if (this.userRole === 'peluquero') {
                const peluqueroSelect = document.getElementById('peluquero');
                if (peluqueroSelect) {
                    peluqueroSelect.value = 'nacho';
                }
            }
            
            document.getElementById('pagoMixtoFields').style.display = 'none';
            document.getElementById('deudaFields').style.display = 'none';
            document.getElementById('montoSimpleField').style.display = 'block';
            const ventaFields = document.getElementById('ventaProductoFields');
                        if (ventaFields) ventaFields.style.display = 'none';
                        const resumenEl = document.getElementById('resumenTotal');
                        if (resumenEl) resumenEl.style.display = 'none';

            console.log('Corte registrado:', cliente, '-', this.formatCurrency(monto));
            const msg = tieneVentaProducto
                ? 'Corte y venta de producto registrados'
                : 'Corte registrado exitosamente';
            this.showToast(msg, 'success');
            this.setupRegistroPage();
        } catch (error) {
            console.error('❌ Error al registrar corte:', error);
            this.showToast('Error al registrar', 'error');
        }
    }


    // ==================== HISTORIAL ====================

    renderHistorial() {
        const tbody = document.getElementById('historialTable');
        if (!tbody) return;

        const filtroFecha = document.getElementById('filtroFecha')?.value || 'todos';
        const filtroPeluquero = document.getElementById('filtroPeluquero')?.value || 'todos';

        let cortesFiltrados = [...this.cortes];

        if (filtroFecha !== 'todos') {
            const hoy = new Date();
            if (filtroFecha === 'hoy') {
                cortesFiltrados = cortesFiltrados.filter(c => {
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return this.isSameDay(fecha, hoy);
                });
            } else if (filtroFecha === 'semana') {
                const hace7dias = new Date(hoy);
                hace7dias.setDate(hoy.getDate() - 7);
                cortesFiltrados = cortesFiltrados.filter(c => {
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return fecha >= hace7dias;
                });
            } else if (filtroFecha === 'mes') {
                const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                cortesFiltrados = cortesFiltrados.filter(c => {
                    const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                    return fecha >= inicioMes;
                });
            }
        }

        if (filtroPeluquero !== 'todos') {
            cortesFiltrados = cortesFiltrados.filter(c => c.peluquero === filtroPeluquero);
        }

        if (cortesFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay registros</td></tr>';
            return;
        }

        tbody.innerHTML = cortesFiltrados.map(c => `
            <tr>
                <td>${this.formatDate(c.fecha)}</td>
                <td>${this.formatTime(c.fecha)}</td>
                <td>${this.getNombrePeluquero(c.peluquero)}</td>
                <td>${this.getNombreTipo(c.tipoCorte)}</td>
                <td>${c.cliente || 'Sin nombre'}</td>
                <td>${this.getNombreMetodo(c.metodoPago)}</td>
                <td>${this.formatCurrency(c.monto)}</td>
                <td>${c.registradoPor || '-'}</td>
                <td>
                    ${this.userRole === 'peluquero' ?
                        `<button class="btn-delete" onclick="app.abrirSolicitudEliminarCorte('${c.id}')">Solicitar Eliminacion</button>` :
                        `<button class="btn-delete" onclick="app.eliminarCorte('${c.id}')">Eliminar</button>`
                    }
                </td>
            </tr>
        `).join('');
    }

    async eliminarCorte(id) {
        if (!confirm('¿Eliminar este corte?')) return;

        try {
            await deleteDoc(doc(db, 'cortes', id));
            console.log('✅ Corte eliminado:', id);
            this.showToast('Corte eliminado', 'success');
        } catch (error) {
            console.error('❌ Error al eliminar:', error);
            this.showToast('Error al eliminar', 'error');
        }
    }

    // ==================== DEUDORES ====================

    renderDeudores() {
        const tbody = document.getElementById('deudoresTable');
        if (!tbody) return;

        if (this.deudas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay deudas registradas</td></tr>';
            return;
        }

        const totalAdeudado = this.deudas.reduce((sum, d) => sum + (d.montoDebe || 0), 0);
        const elemTotal = document.getElementById('totalAdeudado');
        if (elemTotal) elemTotal.textContent = this.formatCurrency(totalAdeudado);

        tbody.innerHTML = this.deudas.map(d => {
            const montoTotal = d.montoTotal || 0;
            const montoPagado = d.montoPagado || 0;
            const montoDebe = d.montoDebe || 0;

            return `
                <tr>
                    <td>${d.cliente || 'Sin nombre'}</td>
                    <td>${this.formatDate(d.fecha)}</td>
                    <td>${this.getNombrePeluquero(d.peluquero)}</td>
                    <td>${this.getNombreTipo(d.tipoCorte)}</td>
                    <td>${this.formatCurrency(montoTotal)}</td>
                    <td>${this.formatCurrency(montoPagado)}</td>
                    <td><strong style="color: var(--danger)">${this.formatCurrency(montoDebe)}</strong></td>
                    <td>
                        ${this.userRole === 'peluquero' ?
                            `<button class="btn-action btn-primary" onclick="app.abrirSolicitudCobrarDeuda('${d.id}')">Solicitar Cobro</button>` :
                            `<button class="btn-action btn-primary" onclick="app.abrirModalPago('${d.id}')">Pagar</button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }

    abrirModalPago(deudaId) {
        this.currentDeudaId = deudaId;
        const deuda = this.deudas.find(d => d.id === deudaId);
        if (!deuda) return;

        document.getElementById('modalClienteNombre').textContent = deuda.cliente;
        document.getElementById('modalMontoDebe').textContent = this.formatCurrency(deuda.montoDebe);
        document.getElementById('montoPago').max = deuda.montoDebe;
        document.getElementById('montoPago').value = deuda.montoDebe;
        document.getElementById('pagarDeudaModal').classList.add('show');
    }

    cerrarModal() {
        document.getElementById('pagarDeudaModal')?.classList.remove('show');
        this.currentDeudaId = null;
    }

    async procesarPagoDeuda() {
        const montoPago = parseFloat(document.getElementById('montoPago')?.value);
        const metodoPago = document.querySelector('input[name="metodoPagoDeuda"]:checked')?.value;

        if (!montoPago || montoPago <= 0) {
            this.showToast('Ingrese un monto valido', 'error');
            return;
        }

        if (!metodoPago) {
            this.showToast('Seleccione metodo de pago', 'error');
            return;
        }

        const deuda = this.deudas.find(d => d.id === this.currentDeudaId);
        if (!deuda) return;

        try {
            const nuevoMontoPagado = deuda.montoPagado + montoPago;
            const nuevoMontoDebe = deuda.montoDebe - montoPago;

            if (nuevoMontoDebe <= 0) {
                await deleteDoc(doc(db, 'deudas', this.currentDeudaId));
                console.log('✅ Deuda saldada:', deuda.cliente);
                this.showToast('Deuda saldada completamente', 'success');
            } else {
                await updateDoc(doc(db, 'deudas', this.currentDeudaId), {
                    montoPagado: nuevoMontoPagado,
                    montoDebe: nuevoMontoDebe
                });
                console.log('Pago parcial registrado:', deuda.cliente, '-', this.formatCurrency(montoPago));
                this.showToast('Pago registrado', 'success');
            }

            await addDoc(collection(db, 'cortes'), {
                fecha: Timestamp.now(),
                peluquero: deuda.peluquero,
                tipoCorte: deuda.tipoCorte,
                metodoPago,
                monto: montoPago,
                montoEfectivo: metodoPago === 'efectivo' ? montoPago : 0,
                montoTransferencia: metodoPago === 'transferencia' ? montoPago : 0,
                cliente: deuda.cliente,
                registradoPor: this.userName,
                esPagoDeuda: true
            });

            this.cerrarModal();
        } catch (error) {
            console.error('❌ Error al procesar pago:', error);
            this.showToast('Error al procesar pago', 'error');
        }
    }

    // ==================== CONFIGURACION ====================

    cargarConfiguracionUI() {
            document.getElementById('precioSoloCorte').value = this.config.precioSoloCorte;
            document.getElementById('precioCorteBarba').value = this.config.precioCorteBarba;
            document.getElementById('precioCorteNino').value = this.config.precioCorteNino || 7000;
            document.getElementById('usarPreciosFijos').checked = this.config.usarPreciosFijos;

            document.getElementById('previewSoloCorte').textContent = this.formatCurrency(this.config.precioSoloCorte);
            document.getElementById('previewCorteBarba').textContent = this.formatCurrency(this.config.precioCorteBarba);
            document.getElementById('previewCorteNino').textContent = this.formatCurrency(this.config.precioCorteNino || 7000);
            document.getElementById('previewModo').textContent = this.config.usarPreciosFijos ? 'Automatico' : 'Manual';
        }

    async guardarConfiguracion() {
        this.config.precioSoloCorte = parseFloat(document.getElementById('precioSoloCorte').value);
        this.config.precioCorteBarba = parseFloat(document.getElementById('precioCorteBarba').value);
        this.config.precioCorteNino = parseFloat(document.getElementById('precioCorteNino').value);
        this.config.usarPreciosFijos = document.getElementById('usarPreciosFijos').checked;

        try {
            await setDoc(doc(db, 'configuracion', 'precios'), this.config);
            console.log('✅ Configuracion guardada');
            this.showToast('Configuracion guardada', 'success');
            this.cargarConfiguracionUI();
        } catch (error) {
            console.error('❌ Error al guardar configuración:', error);
            this.showToast('Error al guardar', 'error');
        }
    }

    // ==================== COMISIONES ====================

    renderComisiones() {
        const comisionSemana = this.calcularComisiones('semana');
        this.actualizarVistaComisiones('Semana', comisionSemana);
        this.renderDesgloseSemanasComisiones();
    }

    calcularComisiones(periodo = 'semana') {
        const hoy = new Date();
        let fechaInicio;

        if (periodo === 'semana') {
            if (periodo === 'semana') {
                fechaInicio = this.getSemanaActualInicio(hoy);
        } else {
            fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        }
    }
        const cortesNacho = this.cortes.filter(c => {
            if (!c.fecha) return false;
            const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
            return fecha >= fechaInicio && (c.peluquero || '').toLowerCase() === 'nacho';
        });

        const cortesFranco = this.cortes.filter(c => {
            if (!c.fecha) return false;
            const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
            return fecha >= fechaInicio && (c.peluquero || '').toLowerCase() === 'franco';
        });

        const totalNacho = cortesNacho.reduce((sum, c) => sum + (c.monto || 0), 0);
        const totalFranco = cortesFranco.reduce((sum, c) => sum + (c.monto || 0), 0);
        const comisionNacho = totalNacho * (this.porcentajeNacho / 100);
        const comisionFrancoDeNacho = totalNacho * (this.porcentajeFranco / 100);
        const gananciaTotalFranco = totalFranco + comisionFrancoDeNacho;

        return {
            nacho: { cortes: cortesNacho.length, total: totalNacho, comision: comisionNacho },
            franco: {
                cortes: cortesFranco.length,
                totalPropio: totalFranco,
                comisionDeNacho: comisionFrancoDeNacho,
                gananciaTotal: gananciaTotalFranco
            }
        }
};

    actualizarVistaComisiones(prefijo, datos) {
        const elemCortesNacho = document.getElementById(`cortesNacho${prefijo}`);
        const elemTotalNacho = document.getElementById(`totalNacho${prefijo}`);
        const elemComisionNacho = document.getElementById(`comisionNacho${prefijo}`);
        const elemCortesFranco = document.getElementById(`cortesFranco${prefijo}`);
        const elemTotalFranco = document.getElementById(`totalFranco${prefijo}`);
        const elemComisionFranco = document.getElementById(`comisionFranco${prefijo}`);
        const elemGananciaFranco = document.getElementById(`gananciaFranco${prefijo}`);

        if (elemCortesNacho) elemCortesNacho.textContent = datos.nacho.cortes;
        if (elemTotalNacho) elemTotalNacho.textContent = this.formatCurrency(datos.nacho.total);
        if (elemComisionNacho) elemComisionNacho.textContent = this.formatCurrency(datos.nacho.comision);
        if (elemCortesFranco) elemCortesFranco.textContent = datos.franco.cortes;
        if (elemTotalFranco) elemTotalFranco.textContent = this.formatCurrency(datos.franco.totalPropio);
        if (elemComisionFranco) elemComisionFranco.textContent = this.formatCurrency(datos.franco.comisionDeNacho);
        if (elemGananciaFranco) elemGananciaFranco.textContent = this.formatCurrency(datos.franco.gananciaTotal);
    }

    renderDesgloseSemanasComisiones() {
        const container = document.getElementById('desgloseSemanasContainer');
        if (!container) return;

        const semanas = [];
        const hoy = new Date();
        const inicioSemanaActual = this.getSemanaActualInicio(hoy);

        for (let i = 0; i < 8; i++) {
            const inicio = new Date(inicioSemanaActual);
            inicio.setDate(inicioSemanaActual.getDate() - (i * 7));
            inicio.setHours(0, 0, 0, 0);

            const fin = new Date(inicio);
            fin.setDate(inicio.getDate() + 5); // Lunes + 5 = Sábado
            fin.setHours(23, 59, 59, 999);

            const cortesNacho = this.cortes.filter(c => {
                if (!c.fecha) return false;
                const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                return fecha >= inicio && fecha <= fin && (c.peluquero || '').toLowerCase() === 'nacho';
            });

            const cortesFranco = this.cortes.filter(c => {
                if (!c.fecha) return false;
                const fecha = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
                return fecha >= inicio && fecha <= fin && (c.peluquero || '').toLowerCase() === 'franco';
            });

            const totalNacho = cortesNacho.reduce((sum, c) => sum + (c.monto || 0), 0);
            const totalFranco = cortesFranco.reduce((sum, c) => sum + (c.monto || 0), 0);
            const pagoNacho = totalNacho * (this.porcentajeNacho / 100);
            const gananciaFranco = totalFranco + totalNacho * (this.porcentajeFranco / 100);

            if (cortesNacho.length === 0 && cortesFranco.length === 0) continue;

            semanas.push({
                label: i === 0 ? 'Esta semana' : `Semana del ${inicio.getDate()}/${inicio.getMonth()+1}`,
                inicio, fin,
                cortesNacho: cortesNacho.length,
                cortesFranco: cortesFranco.length,
                totalNacho, totalFranco,
                pagoNacho, gananciaFranco
            });
        }

        if (semanas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay datos por semana</div>';
            return;
        }

        container.innerHTML = semanas.map(s => `
            <div style="border:2px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:16px;">
                <div style="font-weight:700; color:#2d3d50; font-size:15px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e5e7eb;">
                    ${s.label}
                    <span style="font-weight:400; color:#67676d; font-size:13px; margin-left:8px;">
                        (${s.inicio.getDate()}/${s.inicio.getMonth()+1} - ${s.fin.getDate()}/${s.fin.getMonth()+1})
                    </span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="background:#f0f4ff; border-radius:8px; padding:14px;">
                        <div style="font-size:12px; color:#4a5f80; font-weight:600; margin-bottom:4px;">NACHO</div>
                        <div style="font-size:13px; color:#67676d;">${s.cortesNacho} cortes | Total: ${this.formatCurrency(s.totalNacho)}</div>
                        <div style="font-size:18px; font-weight:700; color:#2d3d50; margin-top:6px;">Pago: ${this.formatCurrency(s.pagoNacho)}</div>
                    </div>
                    <div style="background:#fff0f5; border-radius:8px; padding:14px;">
                        <div style="font-size:12px; color:#c05; font-weight:600; margin-bottom:4px;">FRANCO</div>
                        <div style="font-size:13px; color:#67676d;">${s.cortesFranco} cortes | Total: ${this.formatCurrency(s.totalFranco)}</div>
                        <div style="font-size:18px; font-weight:700; color:#c05; margin-top:6px;">Ganancia: ${this.formatCurrency(s.gananciaFranco)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ==================== PAGOS A NACHO ====================

    abrirModalPagoNacho() {
        const modal = document.getElementById('modalPagoNacho');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('inputMontoNacho').value = '';
            document.getElementById('inputNotaNacho').value = '';
        }
    }

    cerrarModalPagoNacho() {
        const modal = document.getElementById('modalPagoNacho');
        if (modal) modal.style.display = 'none';
    }

    async guardarPagoNacho() {
        const monto = parseFloat(document.getElementById('inputMontoNacho').value);
            const nota = document.getElementById('inputNotaNacho').value.trim();

            if (!monto || monto <= 0) {
                this.showToast('Ingresa un monto valido', 'error');
                return;
            }

            try {
                await addDoc(collection(db, 'pagosNacho'), {
                    monto,
                    nota: nota || '',
                    fecha: serverTimestamp(),
                    registradoPor: this.userName
                });

                this.cerrarModalPagoNacho();
                this.showToast('Pago registrado correctamente', 'success');
                await this.cargarPagosNacho();
                this.renderHistorialPagosNacho();
            } catch (error) {
                console.error('Error al guardar pago:', error);
                this.showToast('Error al guardar pago', 'error');
            }
    }

    async cargarPagosNacho() {
        try {
                const q = query(collection(db, 'pagosNacho'), orderBy('fecha', 'desc'));
                const snap = await getDocs(q);
                this.pagosNacho = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (error) {
                console.error('Error al cargar pagos Nacho:', error);
                this.pagosNacho = [];
            }

    }

    toggleHistorialPagosNacho() {
        const container = document.getElementById('historialPagosNachoContainer');
        const btn = document.getElementById('btnToggleHistorialNacho');
        if (!container) return;

        const visible = container.style.display !== 'none';
        container.style.display = visible ? 'none' : 'block';
        btn.textContent = visible ? 'Ver historial de pagos' : 'Ocultar historial';

        if (!visible) this.renderHistorialPagosNacho();
    }

    renderHistorialPagosNacho() {
        const lista = document.getElementById('historialPagosNachoLista');
        if (!lista) return;

        const pagos = this.pagosNacho || [];

        if (pagos.length === 0) {
            lista.innerHTML = '<div style="text-align:center; color:rgba(255,255,255,0.7); padding:20px;">No hay pagos registrados aun</div>';
            return;
        }

        lista.innerHTML = pagos.map(p => {
            const fecha = p.fecha ? (p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha)) : new Date();
            const fechaStr = fecha.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
            const horaStr = fecha.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.2);">
                    <div>
                        <div style="font-weight:600; font-size:15px;">${this.formatCurrency(p.monto)}</div>
                        <div style="font-size:12px; opacity:0.8; margin-top:2px;">${fechaStr} ${horaStr}${p.nota ? ' - ' + p.nota : ''}</div>
                    </div>
                    <div style="font-size:12px; opacity:0.7;">por ${p.registradoPor || '-'}</div>
                </div>
            `;
        }).join('');
    }

    // ==================== SOLICITUDES ====================

    actualizarBadgeSolicitudes() {
        const badge = document.getElementById('solicitudesBadge');
        if (!badge) return;
        const pendientes = this.solicitudes.filter(s => s.estado === 'pendiente').length;
        badge.textContent = pendientes;
        badge.style.display = pendientes > 0 ? 'flex' : 'none';
    }

    renderSolicitudes() {
        const pendientes = this.solicitudes.filter(s => s.estado === 'pendiente');
        const historial = this.solicitudes.filter(s => s.estado !== 'pendiente');
        this.renderSolicitudesPendientes(pendientes);
        this.renderHistorialSolicitudes(historial);
    }

    renderSolicitudesPendientes(pendientes) {
        const container = document.getElementById('solicitudesPendientesContainer');
        if (!container) return;

        if (pendientes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>✅ No hay solicitudes pendientes</p></div>';
            return;
        }

        container.innerHTML = pendientes.map(sol => {
            const icono = sol.tipo === 'eliminar_corte' ? '🗑️' : '💰';
            const titulo = sol.tipo === 'eliminar_corte' ? 'Eliminar Corte' : 'Cobrar Deuda';
            let detalles = '';

            if (sol.tipo === 'eliminar_corte') {
                const corte = this.cortes.find(c => c.id === sol.corteId);
                if (corte) detalles = `<strong>Corte:</strong> ${corte.cliente} - ${this.formatCurrency(corte.monto)}`;
            } else {
                const deuda = this.deudas.find(d => d.id === sol.deudaId);
                if (deuda) detalles = `<strong>Cliente:</strong> ${deuda.cliente}<br><strong>Monto:</strong> ${this.formatCurrency(sol.montoCobro)}`;
            }

            return `
                <div class="solicitud-card pendiente">
                    <div class="solicitud-header">
                        <span class="solicitud-icon">${icono}</span>
                        <div>
                            <h4>${titulo}</h4>
                            <p class="solicitud-meta">${sol.solicitadoPor} - ${this.formatDate(sol.fechaSolicitud)}</p>
                        </div>
                    </div>
                    <div class="solicitud-body">
                        <div class="solicitud-detalles">${detalles}</div>
                        <div class="solicitud-motivo">
                            <strong>Motivo:</strong>
                            <p>"${sol.notaSolicitante}"</p>
                        </div>
                    </div>
                    <div class="solicitud-actions">
                        <button class="btn-success" onclick="app.abrirModalRespuesta('${sol.id}', 'aprobar')">✅ Aprobar</button>
                        <button class="btn-danger" onclick="app.abrirModalRespuesta('${sol.id}', 'rechazar')">❌ Rechazar</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderHistorialSolicitudes(historial) {
        const container = document.getElementById('historialSolicitudesContainer');
        if (!container) return;
        
        if (historial.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay historial</p>';
            return;
        }
        
        container.innerHTML = historial.slice(0, 10).map(sol => {
            const estadoClass = sol.estado === 'aprobada' ? 'aprobada' : 'rechazada';
            const estadoTexto = sol.estado === 'aprobada' ? 'Aprobada' : 'Rechazada';
            const titulo = sol.tipo === 'eliminar_corte' ? 'Eliminar Corte' : 'Cobrar Deuda';
            
            return `
                <div class="solicitud-card ${estadoClass}">
                    <div class="solicitud-header">
                        <div>
                            <h4>${titulo} - <span class="estado-badge">${estadoTexto}</span></h4>
                            <p class="solicitud-meta">${sol.solicitadoPor} - ${this.formatDate(sol.fechaSolicitud)}</p>
                        </div>
                    </div>
                    <div class="solicitud-body">
                        <p><strong>Motivo:</strong> "${sol.notaSolicitante}"</p>
                        ${sol.notaAdmin ? `<p><strong>Respuesta:</strong> "${sol.notaAdmin}"</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    abrirSolicitudEliminarCorte(corteId) {
        this.currentCorteToDelete = corteId;
        document.getElementById('solicitudEliminarModal').classList.add('show');
        document.getElementById('motivoEliminacion').value = '';
    }

    cerrarSolicitudEliminarModal() {
        document.getElementById('solicitudEliminarModal')?.classList.remove('show');
        this.currentCorteToDelete = null;
    }

    async enviarSolicitudEliminar() {
        const motivo = document.getElementById('motivoEliminacion').value.trim();
        if (!motivo || motivo.length < 10) {
            this.showToast('Debes explicar el motivo (minimo 10 caracteres)', 'error');
            return;
        }
        
        try {
            await addDoc(collection(db, 'solicitudes'), {
                tipo: 'eliminar_corte',
                corteId: this.currentCorteToDelete,
                solicitadoPor: this.userName,
                fechaSolicitud: Timestamp.now(),
                estado: 'pendiente',
                notaSolicitante: motivo
            });
            console.log('Solicitud de eliminacion enviada');
            this.showToast('Solicitud enviada a Franco', 'success');
            this.cerrarSolicitudEliminarModal();
        } catch (error) {
            console.error('❌ Error al enviar solicitud:', error);
            this.showToast('Error al enviar solicitud', 'error');
        }
    }

    abrirSolicitudCobrarDeuda(deudaId) {
        this.currentDeudaId = deudaId;
        const deuda = this.deudas.find(d => d.id === deudaId);
        if (!deuda) return;
        
        document.getElementById('solicitudClienteNombre').textContent = deuda.cliente;
        document.getElementById('solicitudMontoDebe').textContent = this.formatCurrency(deuda.montoDebe);
        document.getElementById('montoCobrarSolicitud').max = deuda.montoDebe;
        document.getElementById('montoCobrarSolicitud').value = deuda.montoDebe;
        document.getElementById('solicitudCobroModal').classList.add('show');
    }

    cerrarSolicitudCobroModal() {
        document.getElementById('solicitudCobroModal')?.classList.remove('show');
        this.currentDeudaId = null;
    }

    async enviarSolicitudCobro() {
        const motivo = document.getElementById('motivoCobro').value.trim();
        const montoCobro = parseFloat(document.getElementById('montoCobrarSolicitud').value);
        const metodoPago = document.querySelector('input[name="metodoPagoSolicitud"]:checked')?.value;

        if (!motivo || motivo.length < 10) {
            this.showToast('Explica el motivo (minimo 10 caracteres)', 'error');
            return;
        }
        if (!montoCobro || montoCobro <= 0) {
            this.showToast('Monto invalido', 'error');
            return;
        }

        try {
            await addDoc(collection(db, 'solicitudes'), {
                tipo: 'cobrar_deuda',
                deudaId: this.currentDeudaId,
                montoCobro,
                metodoPago,
                solicitadoPor: this.userName,
                fechaSolicitud: Timestamp.now(),
                estado: 'pendiente',
                notaSolicitante: motivo
            });
            console.log('Solicitud de cobro enviada');
            this.showToast('Solicitud enviada a Franco', 'success');
            this.cerrarSolicitudCobroModal();
        } catch (error) {
            console.error('❌ Error al enviar solicitud:', error);
            this.showToast('Error al enviar', 'error');
        }
    }

    abrirModalRespuesta(solicitudId, accion) {
        this.currentSolicitudId = solicitudId;
        document.getElementById('accionSolicitud').value = accion;
        document.getElementById('tituloAccion').textContent =
            accion === 'aprobar' ? '✅ Aprobar Solicitud' : '❌ Rechazar Solicitud';
        document.getElementById('responderSolicitudModal').classList.add('show');
    }

    cerrarModalRespuesta() {
        document.getElementById('responderSolicitudModal')?.classList.remove('show');
        this.currentSolicitudId = null;
    }

    async responderSolicitud() {
        const accion = document.getElementById('accionSolicitud').value;
        const nota = document.getElementById('notaRespuesta').value.trim();

        if (!nota || nota.length < 5) {
            this.showToast('Agrega una nota (minimo 5 caracteres)', 'error');
            return;
        }

        const solicitud = this.solicitudes.find(s => s.id === this.currentSolicitudId);
        if (!solicitud) return;

        try {
            if (accion === 'aprobar') {
                if (solicitud.tipo === 'eliminar_corte') {
                    await deleteDoc(doc(db, 'cortes', solicitud.corteId));
                } else if (solicitud.tipo === 'cobrar_deuda') {
                    await this.procesarCobroAprobado(solicitud);
                }
            }

            await updateDoc(doc(db, 'solicitudes', this.currentSolicitudId), {
                estado: accion === 'aprobar' ? 'aprobada' : 'rechazada',
                aprobadoPor: this.userName,
                fechaRespuesta: Timestamp.now(),
                notaAdmin: nota
            });

            console.log(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}`);
            this.showToast(accion === 'aprobar' ? 'Solicitud aprobada' : 'Solicitud rechazada', 'success');
            this.cerrarModalRespuesta();
        } catch (error) {
            console.error('❌ Error al procesar solicitud:', error);
            this.showToast('Error al procesar', 'error');
        }
    }

    async procesarCobroAprobado(solicitud) {
        const deuda = this.deudas.find(d => d.id === solicitud.deudaId);
        if (!deuda) return;

        const montoCobro = solicitud.montoCobro;
        const nuevoMontoDebe = deuda.montoDebe - montoCobro;

        if (nuevoMontoDebe <= 0) {
            await deleteDoc(doc(db, 'deudas', solicitud.deudaId));
        } else {
            await updateDoc(doc(db, 'deudas', solicitud.deudaId), {
                montoPagado: deuda.montoPagado + montoCobro,
                montoDebe: nuevoMontoDebe
            });
        }

        await addDoc(collection(db, 'cortes'), {
            fecha: Timestamp.now(),
            peluquero: deuda.peluquero,
            tipoCorte: deuda.tipoCorte,
            metodoPago: solicitud.metodoPago,
            monto: montoCobro,
            montoEfectivo: solicitud.metodoPago === 'efectivo' ? montoCobro : 0,
            montoTransferencia: solicitud.metodoPago === 'transferencia' ? montoCobro : 0,
            cliente: deuda.cliente,
            registradoPor: this.userName,
            esPagoDeuda: true
        });
    }

    renderBonos() {
        this.renderBonosActivos();
        this.renderHistorialBonos();
    }

    renderBonosActivos() {
        const container = document.getElementById('bonosActivosContainer');
        if (!container) return;

        const activos = this.bonos.filter(b => b.cortesRestantes > 0);

        if (activos.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay bonos activos</p></div>';
            return;
        }

        container.innerHTML = activos.map(bono => {
            const diasRestantes = this.calcularDiasRestantes(bono.fechaVencimiento);
            const porcentajeUsado = ((bono.totalCortes - bono.cortesRestantes) / bono.totalCortes) * 100;
            const vencido = diasRestantes < 0;
            const porVencer = diasRestantes <= 7 && diasRestantes >= 0;

            return `
                <div class="bono-card ${vencido ? 'vencido' : ''} ${porVencer ? 'por-vencer' : ''}" data-cliente="${bono.cliente.toLowerCase()}">
                    <div class="bono-header">
                        <div>
                            <h4>${bono.cliente}</h4>
                            <p class="bono-meta">Comprado: ${this.formatDate(bono.fechaCompra)}</p>
                        </div>
                        <div class="bono-badge">
                            ${vencido ? '🚫 Vencido' : porVencer ? '⚠️ Por vencer' : '✅ Activo'}
                        </div>
                    </div>

                    <div class="bono-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${porcentajeUsado}%"></div>
                        </div>
                        <div class="progress-text">
                            <span>${bono.totalCortes - bono.cortesRestantes} de ${bono.totalCortes} cortes usados</span>
                            <span><strong>${bono.cortesRestantes} restantes</strong></span>
                        </div>
                    </div>

                    <div class="bono-info-grid">
                        <div class="info-item">
                            <span class="info-label">Monto pagado:</span>
                            <span class="info-value">${this.formatCurrency(bono.montoPagado)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Vencimiento:</span>
                            <span class="info-value ${vencido ? 'text-danger' : porVencer ? 'text-warning' : ''}">${this.formatDate(bono.fechaVencimiento)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Vendido por:</span>
                            <span class="info-value">${bono.vendidoPor}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Peluquero:</span>
                            <span class="info-value">${this.getNombrePeluquero(bono.peluquero)}</span>
                        </div>
                    </div>

                    <div class="bono-actions">
                        <button class="btn-usar-bono" onclick="app.usarBono('${bono.id}')">
                            Usar Corte
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderHistorialBonos() {
        const tbody = document.getElementById('historialBonosTable');
        if (!tbody) return;

        const completados = this.bonos.filter(b => b.cortesRestantes === 0);

        if (completados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay bonos completados</td></tr>';
            return;
        }

        tbody.innerHTML = completados.slice(0, 20).map(bono => `
            <tr>
                <td>${bono.cliente}</td>
                <td>${this.formatDate(bono.fechaCompra)}</td>
                <td>${this.formatDate(bono.fechaVencimiento)}</td>
                <td>${bono.totalCortes}</td>
                <td>${this.formatCurrency(bono.montoPagado)}</td>
                <td>${this.getNombrePeluquero(bono.peluquero)}</td>
                <td>${bono.vendidoPor}</td>
            </tr>
        `).join('');
    }

    abrirModalNuevoBono() {
        document.getElementById('nuevoBonoModal').classList.add('show');

        // Calcular precio sugerido con descuento
        const precioCorte = this.config.precioSoloCorte || 9000;
        const precioNormal = precioCorte * 4;
        const descuento = Math.round(precioNormal * 0.10); // 10% descuento
        const precioConDescuento = precioNormal - descuento;

        document.getElementById('bonoMontoSugerido').textContent =
            `Precio normal: ${this.formatCurrency(precioNormal)} | Con 10% descuento: ${this.formatCurrency(precioConDescuento)}`;
        document.getElementById('bonoMonto').value = precioConDescuento;

        // Fecha de vencimiento: 35 días desde hoy
        const hoy = new Date();
        const vencimiento = new Date(hoy);
        vencimiento.setDate(vencimiento.getDate() + 35);
        document.getElementById('bonoVencimiento').value = vencimiento.toISOString().split('T')[0];
    }

    cerrarModalNuevoBono() {
        document.getElementById('nuevoBonoModal').classList.remove('show');
        document.getElementById('nuevoBonoForm').reset();
    }

    async guardarNuevoBono() {
        const cliente = document.getElementById('bonoCliente').value.trim();
        const peluquero = document.getElementById('bonoPeluquero').value;
        const monto = parseFloat(document.getElementById('bonoMonto').value);
        const vencimiento = document.getElementById('bonoVencimiento').value;
        const metodoPago = document.querySelector('input[name="metodoPagoBono"]:checked')?.value;

        if (!cliente || !peluquero || !monto || !vencimiento || !metodoPago) {
            this.showToast('Complete todos los campos', 'error');
            return;
        }

        if (monto <= 0) {
            this.showToast('Monto inválido', 'error');
            return;
        }

        const fechaVencimiento = new Date(vencimiento);
        const hoy = new Date();

        if (fechaVencimiento <= hoy) {
            this.showToast('La fecha de vencimiento debe ser futura', 'error');
            return;
        }

        try {
            const bono = {
                cliente,
                peluquero,
                montoPagado: monto,
                metodoPago,
                totalCortes: 4,
                cortesRestantes: 4,
                fechaCompra: Timestamp.now(),
                fechaVencimiento: Timestamp.fromDate(fechaVencimiento),
                vendidoPor: this.userName,
                activo: true
            };

            await addDoc(collection(db, 'bonos'), bono);

            // Registrar el ingreso en cortes
            const montoEfectivo = metodoPago === 'efectivo' ? monto : 0;
            const montoTransferencia = metodoPago === 'transferencia' ? monto : 0;

            await addDoc(collection(db, 'cortes'), {
                fecha: Timestamp.now(),
                peluquero,
                tipoCorte: 'bono-mensual',
                metodoPago,
                monto,
                montoEfectivo,
                montoTransferencia,
                cliente,
                registradoPor: this.userName,
                esBono: true
            });

            this.showToast('Bono creado exitosamente', 'success');
            this.cerrarModalNuevoBono();
        } catch (error) {
            console.error('Error al crear bono:', error);
            this.showToast('Error al crear bono', 'error');
        }
    }

    async usarBono(bonoId) {
        const bono = this.bonos.find(b => b.id === bonoId);
        if (!bono) return;

        if (bono.cortesRestantes <= 0) {
            this.showToast('Este bono ya no tiene cortes disponibles', 'error');
            return;
        }

        // Verificar si está vencido
        const diasRestantes = this.calcularDiasRestantes(bono.fechaVencimiento);
        if (diasRestantes < 0) {
            if (!confirm('⚠️ Este bono está vencido. ¿Desea usarlo de todas formas?')) {
                return;
            }
        }

        if (!confirm(`¿Usar 1 corte del bono de ${bono.cliente}? Quedarán ${bono.cortesRestantes - 1} cortes.`)) {
            return;
        }

        try {
            // Actualizar bono
            const nuevosRestantes = bono.cortesRestantes - 1;
            await updateDoc(doc(db, 'bonos', bonoId), {
                cortesRestantes: nuevosRestantes,
                activo: nuevosRestantes > 0
            });

            // Registrar el corte (sin monto, es del bono)
            await addDoc(collection(db, 'cortes'), {
                fecha: Timestamp.now(),
                peluquero: bono.peluquero,
                tipoCorte: 'solo-corte',
                metodoPago: 'bono',
                monto: 0,
                montoEfectivo: 0,
                montoTransferencia: 0,
                cliente: bono.cliente,
                registradoPor: this.userName,
                bonoId: bonoId,
                esUsoBono: true
            });

            this.showToast(`✅ Corte usado. Quedan ${nuevosRestantes} cortes en el bono`, 'success');
        } catch (error) {
            console.error('Error al usar bono:', error);
            this.showToast('Error al usar bono', 'error');
        }
    }

    calcularDiasRestantes(fechaVencimiento) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const vencimiento = fechaVencimiento.toDate ? fechaVencimiento.toDate() : new Date(fechaVencimiento);
        vencimiento.setHours(0, 0, 0, 0);

        const diffTime = vencimiento - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    filtrarBonos(busqueda) {
        const container = document.getElementById('bonosActivosContainer');
        if (!container) return;

        const bonos = container.querySelectorAll('.bono-card');
        const terminoBusqueda = busqueda.toLowerCase().trim();

        if (terminoBusqueda === '') {
            // Mostrar todos si no hay búsqueda
            bonos.forEach(bono => bono.classList.remove('hidden'));
            this.actualizarMensajeNoResultados(false);
            return;
        }

        let encontrados = 0;
        bonos.forEach(bono => {
            const nombreCliente = bono.getAttribute('data-cliente') || '';

            if (nombreCliente.includes(terminoBusqueda)) {
                bono.classList.remove('hidden');
                encontrados++;
            } else {
                bono.classList.add('hidden');
            }
        });

        this.actualizarMensajeNoResultados(encontrados === 0);
    }

    actualizarMensajeNoResultados(mostrar) {
        const container = document.getElementById('bonosActivosContainer');
        if (!container) return;

        let mensaje = container.querySelector('.no-results-message');

        if (mostrar && !mensaje) {
            // Crear mensaje si no existe
            mensaje = document.createElement('div');
            mensaje.className = 'no-results-message';
            mensaje.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>
                <p>No se encontraron bonos con ese nombre</p>
            `;
            container.appendChild(mensaje);
        } else if (!mostrar && mensaje) {
            // Remover mensaje si existe
            mensaje.remove();
        }
    }

    // ==================== UTILIDADES ====================

    isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    getSemanaActualInicio(referencia) {
        // La semana va de lunes (1) a sábado (6)
        const d = new Date(referencia);
        d.setHours(0, 0, 0, 0);
        const dia = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
        const diasDesdelLunes = dia === 0 ? 6 : dia - 1; // Dom cae en semana anterior
        d.setDate(d.getDate() - diasDesdelLunes);
        return d;
    }

    formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    formatDate(fecha) {
        if (!fecha) return 'Sin fecha';

        try {
            const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
            if (isNaN(d.getTime())) return 'Fecha invalida';
            return d.toLocaleDateString('es-AR');
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return 'Fecha invalida';
        }
    }

    formatTime(fecha) {
        if (!fecha) return '--:--';
        
        try {
            const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
            if (isNaN(d.getTime())) return '--:--';
            return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return '--:--';
        }
    }

    getNombrePeluquero(peluquero) {
        const nombre = (peluquero || '').toLowerCase();
        if (nombre === 'franco') return 'Franco';
        if (nombre === 'nacho') return 'Nacho';
        return peluquero || 'Desconocido';
    }

    getNombreTipo(tipo) {
            if (tipo === 'solo-corte') return 'Solo Corte';
            if (tipo === 'corte-barba') return 'Corte + Barba';
            if (tipo === 'corte-nino') return 'Corte Niño';
            return tipo;
        }

    getNombreMetodo(metodo) {
        if (metodo === 'efectivo') return 'Efectivo';
        if (metodo === 'transferencia') return 'Transferencia';
        return 'Pago Mixto';
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    updateUserName() {
        const el = document.getElementById('currentUserName');
        if (el) el.textContent = this.userName;
    }

    updateDate() {
        const el = document.getElementById('currentDate');
        if (el) el.textContent = new Date().toLocaleDateString('es-AR');
    }

    async logout() {
        try {
            if (this.unsubscribeCortes) this.unsubscribeCortes();
            if (this.unsubscribeDeudas) this.unsubscribeDeudas();
            if (this.unsubscribeCierres) this.unsubscribeCierres();
            if (this.unsubscribeVentas) this.unsubscribeVentas();
            if (this.unsubscribeSolicitudes) this.unsubscribeSolicitudes();
            if (this.unsubscribeBonos) this.unsubscribeBonos();
            
            await signOut(auth);
            sessionStorage.removeItem('sessionActive');
            sessionStorage.clear();
            console.log('👋 Sesión cerrada');


            window.location.href = 'https://barberia-folianosv1.firebaseapp.com/index.html';
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
        }
    }

    calcularPrecio(tipoCorte) {
            if (!this.config.usarPreciosFijos) return null;

            if (tipoCorte === 'corte-barba') {
                return this.config.precioCorteBarba;
            }

            if (tipoCorte === 'solo-corte') {
                return this.config.precioSoloCorte;
            }

            if (tipoCorte === 'corte-nino') {
                return this.config.precioCorteNino;
            }

            return null;
        }


}

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "https://barberia-folianosv1.firebaseapp.com/index.html";
    } else {
        document.body.style.visibility = 'visible';
        window.app = new BarberiaSystem(user);
    }
});
