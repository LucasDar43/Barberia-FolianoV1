// ============================================
// EXTENSION CIERRE DE CAJA V2
// ============================================

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

function inicializarExtensiones() {
    if (!window.app) {
        setTimeout(inicializarExtensiones, 200);
        return;
    }
    console.log('Inicializando extension de cierre con Firestore...');
    agregarFuncionesCierre();
    extenderNavigation();
    console.log('Extension de cierre inicializada correctamente');
}

// ==================== FUNCIONES DE CIERRE ====================
function agregarFuncionesCierre() {
    console.log('Agregando funciones de cierre a app...');

    // ---- RENDER PRINCIPAL ----
    app.renderCierre = async function() {
        await this.cargarMovimientosCaja();
        this.actualizarEstadoCaja();
        this.renderVentasMes();
        this.renderHistorialCierres();
    };

    // ---- CARGAR MOVIMIENTOS ----
    app.cargarMovimientosCaja = async function() {
        try {
            const q = query(collection(db, 'caja'), orderBy('fecha', 'desc'));
            const snap = await getDocs(q);
            this.movimientosCaja = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error('Error al cargar caja:', error);
            this.movimientosCaja = [];
        }
    };

    // ---- ACTUALIZAR ESTADO ----
    app.actualizarEstadoCaja = function() {
        const hoy = new Date();
        const movimientos = this.movimientosCaja || [];

        // Buscar apertura de hoy
        const aperturaHoy = movimientos.find(m => {
            if (m.tipo !== 'apertura') return false;
            const f = m.fecha.toDate ? m.fecha.toDate() : new Date(m.fecha);
            return this.isSameDay(f, hoy);
        });

        // Retiros de hoy
        const retirosHoy = movimientos.filter(m => {
            if (m.tipo !== 'retiro') return false;
            const f = m.fecha.toDate ? m.fecha.toDate() : new Date(m.fecha);
            return this.isSameDay(f, hoy);
        });

        const totalRetirosHoy = retirosHoy.reduce((s, m) => s + (m.monto || 0), 0);

        // Efectivo y transferencias de cortes de hoy
        const cortesHoy = this.cortes.filter(c => {
            if (!c.fecha) return false;
            const f = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
            return this.isSameDay(f, hoy);
        });

        let efectivoHoy = 0;
        let transferenciaHoy = 0;
        cortesHoy.forEach(c => {
            efectivoHoy += c.montoEfectivo || 0;
            transferenciaHoy += c.montoTransferencia || 0;
        });

        // Ventas de productos de hoy
        const ventasHoy = (this.ventas || []).filter(v => {
            if (!v.fecha) return false;
            const f = v.fecha.toDate ? v.fecha.toDate() : new Date(v.fecha);
            return this.isSameDay(f, hoy);
        });
        let efectivoVentas = 0;
        let transferenciaVentas = 0;
        ventasHoy.forEach(v => {
            efectivoVentas += v.montoEfectivo || 0;
            transferenciaVentas += v.montoTransferencia || 0;
        });
        const totalVentasHoy = efectivoVentas + transferenciaVentas;

        efectivoHoy += efectivoVentas;
        transferenciaHoy += transferenciaVentas;

        // Calcular saldo inicial:
        // Si hay apertura hoy, usarla.
        // Si no, tomar el saldo del ultimo cierre.
        let saldoInicial = 0;
        if (aperturaHoy) {
            saldoInicial = aperturaHoy.monto || 0;
        } else {
            // Buscar ultimo cierre para saber cuanto quedo en caja
            const cierres = movimientos.filter(m => m.tipo === 'cierre');
            if (cierres.length > 0) {
                saldoInicial = cierres[0].efectivoFisico || 0;
            }
        }

        const totalEsperado = saldoInicial + efectivoHoy - totalRetirosHoy;

        // Actualizar UI
        const setSafe = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatCurrency(val);
        };
        setSafe('cierreSaldoInicial', saldoInicial);
        setSafe('cierreEfectivoRegistrado', efectivoHoy);
        setSafe('cierreTransferenciaRegistrada', transferenciaHoy);
        setSafe('cierreRetirosHoy', totalRetirosHoy);
        setSafe('cierreTotalEsperado', totalEsperado);
        setSafe('modalCierreTotalEsperado', totalEsperado);

        // Mostrar fila de ventas si hay
        const filaVentas = document.getElementById('filaCierreVentas');
        const elemVentas = document.getElementById('cierreVentasProducto');
        if (filaVentas && elemVentas) {
            elemVentas.textContent = this.formatCurrency(totalVentasHoy);
            filaVentas.style.display = totalVentasHoy > 0 ? 'flex' : 'none';
        }

        // Estado apertura
        const estadoEl = document.getElementById('estadoApertura');
        const btnApertura = document.getElementById('btnApertura');
        if (estadoEl && btnApertura) {
            if (aperturaHoy) {
                estadoEl.textContent = 'Registrada: ' + this.formatCurrency(aperturaHoy.monto);
                estadoEl.style.color = '#10b981';
                btnApertura.textContent = 'Ya registrada';
                btnApertura.disabled = true;
                btnApertura.style.opacity = '0.5';
            } else {
                estadoEl.textContent = 'Sin registrar hoy';
                estadoEl.style.color = '#f59e0b';
                btnApertura.textContent = 'Registrar Apertura';
                btnApertura.disabled = false;
                btnApertura.style.opacity = '1';
            }
        }

        // Guardar para usar en modal cierre
        this._totalEsperadoCaja = totalEsperado;
    };

    // ---- APERTURA ----
    app.abrirModalApertura = function() {
        document.getElementById('inputSaldoApertura').value = '';
        document.getElementById('modalApertura').style.display = 'flex';
    };

    app.cerrarModalApertura = function() {
        document.getElementById('modalApertura').style.display = 'none';
    };

    app.guardarApertura = async function() {
        const monto = parseFloat(document.getElementById('inputSaldoApertura').value);
        if (isNaN(monto) || monto < 0) {
            this.showToast('Ingresa un monto valido', 'error');
            return;
        }
        try {
            await addDoc(collection(db, 'caja'), {
                tipo: 'apertura',
                monto,
                fecha: Timestamp.now(),
                registradoPor: this.userName
            });
            this.cerrarModalApertura();
            this.showToast('Apertura registrada', 'success');
            await this.cargarMovimientosCaja();
            this.actualizarEstadoCaja();
            this.renderHistorialCierres();
        } catch (e) {
            console.error(e);
            this.showToast('Error al guardar apertura', 'error');
        }
    };

    // ---- RETIRO ----
    app.abrirModalRetiro = function() {
        document.getElementById('inputMontoRetiro').value = '';
        document.getElementById('inputMotivoRetiro').value = '';
        document.getElementById('modalRetiro').style.display = 'flex';
    };

    app.cerrarModalRetiro = function() {
        document.getElementById('modalRetiro').style.display = 'none';
    };

    app.guardarRetiro = async function() {
        const monto = parseFloat(document.getElementById('inputMontoRetiro').value);
        const motivo = document.getElementById('inputMotivoRetiro').value.trim();
        if (!monto || monto <= 0) {
            this.showToast('Ingresa un monto valido', 'error');
            return;
        }
        try {
            await addDoc(collection(db, 'caja'), {
                tipo: 'retiro',
                monto,
                motivo: motivo || '',
                fecha: Timestamp.now(),
                registradoPor: this.userName
            });
            this.cerrarModalRetiro();
            this.showToast('Retiro registrado', 'success');
            await this.cargarMovimientosCaja();
            this.actualizarEstadoCaja();
            this.renderHistorialCierres();
        } catch (e) {
            console.error(e);
            this.showToast('Error al guardar retiro', 'error');
        }
    };

    // ---- CIERRE ----
    app.abrirModalCierre = function() {
        document.getElementById('inputEfectivoCierre').value = '';
        document.getElementById('notasCierre').value = '';
        document.getElementById('cierreDiferencia').style.display = 'none';
        const el = document.getElementById('modalCierreTotalEsperado');
        if (el) el.textContent = this.formatCurrency(this._totalEsperadoCaja || 0);
        document.getElementById('modalCierre').style.display = 'flex';
    };

    app.cerrarModalCierre = function() {
        document.getElementById('modalCierre').style.display = 'none';
    };

    app.calcularDiferenciaCierre = function() {
        const fisico = parseFloat(document.getElementById('inputEfectivoCierre').value) || 0;
        const esperado = this._totalEsperadoCaja || 0;
        const diferencia = fisico - esperado;
        const div = document.getElementById('cierreDiferencia');
        if (!div) return;

        if (document.getElementById('inputEfectivoCierre').value === '') {
            div.style.display = 'none';
            return;
        }

        div.style.display = 'block';
        if (diferencia === 0) {
            div.style.background = '#ecfdf5';
            div.style.color = '#059669';
            div.textContent = 'Caja cuadrada - Sin diferencias';
        } else if (diferencia > 0) {
            div.style.background = '#fffbeb';
            div.style.color = '#d97706';
            div.textContent = 'Sobran ' + this.formatCurrency(diferencia);
        } else {
            div.style.background = '#fef2f2';
            div.style.color = '#dc2626';
            div.textContent = 'Faltan ' + this.formatCurrency(Math.abs(diferencia));
        }
    };

    app.confirmarCierre = async function() {
        const efectivoFisico = parseFloat(document.getElementById('inputEfectivoCierre').value);
        const notas = document.getElementById('notasCierre').value.trim();

        if (isNaN(efectivoFisico)) {
            this.showToast('Ingresa el efectivo fisico contado', 'error');
            return;
        }

        const esperado = this._totalEsperadoCaja || 0;

        try {
            await addDoc(collection(db, 'caja'), {
                tipo: 'cierre',
                efectivoFisico,
                efectivoEsperado: esperado,
                diferencia: efectivoFisico - esperado,
                notas: notas || '',
                fecha: Timestamp.now(),
                registradoPor: this.userName
            });
            this.cerrarModalCierre();
            this.showToast('Cierre de caja confirmado', 'success');
            await this.cargarMovimientosCaja();
            this.actualizarEstadoCaja();
            this.renderHistorialCierres();
        } catch (e) {
            console.error(e);
            this.showToast('Error al confirmar cierre', 'error');
        }
    };

    // ---- HISTORIAL ----
    app.renderHistorialCierres = function() {
        const tbody = document.getElementById('historialCierresTable');
        if (!tbody) return;

        const movimientos = this.movimientosCaja || [];

        if (movimientos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay registros</td></tr>';
            return;
        }

        const tipoLabel = {
            apertura: '<span style="background:#dbeafe; color:#1d4ed8; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">Apertura</span>',
            retiro:   '<span style="background:#fee2e2; color:#dc2626; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">Retiro</span>',
            cierre:   '<span style="background:#f0fdf4; color:#16a34a; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">Cierre</span>'
        };

        tbody.innerHTML = movimientos.slice(0, 30).map(m => {
            const fecha = m.fecha ? (m.fecha.toDate ? m.fecha.toDate() : new Date(m.fecha)) : new Date();
            const fechaStr = fecha.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
            const horaStr = fecha.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });

            let monto = '';
            let detalle = '-';

            if (m.tipo === 'apertura') {
                monto = this.formatCurrency(m.monto);
                detalle = 'Saldo inicial';
            } else if (m.tipo === 'retiro') {
                monto = '<span style="color:#dc2626;">-' + this.formatCurrency(m.monto) + '</span>';
                detalle = m.motivo || 'Retiro';
            } else if (m.tipo === 'cierre') {
                const dif = m.diferencia || 0;
                monto = this.formatCurrency(m.efectivoFisico);
                detalle = dif === 0 ? 'Cuadrado'
                    : dif > 0 ? 'Sobran ' + this.formatCurrency(dif)
                    : 'Faltan ' + this.formatCurrency(Math.abs(dif));
                if (m.notas) detalle += ' - ' + m.notas;
            }

            return `
                <tr>
                    <td>${fechaStr} ${horaStr}</td>
                    <td>${tipoLabel[m.tipo] || m.tipo}</td>
                    <td>${monto}</td>
                    <td>${detalle}</td>
                    <td>${m.registradoPor || '-'}</td>
                </tr>
            `;
        }).join('');
    };

    app.renderVentasMes = function() {
        const tbody = document.getElementById('ventasMesTable');
        if (!tbody) return;

        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        const ventasMes = (this.ventas || []).filter(v => {
            const fecha = v.fecha.toDate ? v.fecha.toDate() : new Date(v.fecha);
            return fecha >= inicioMes;
        });

        const totalEl = document.getElementById('totalVentasMes');

        if (ventasMes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay ventas de productos este mes</td></tr>';
            if (totalEl) totalEl.textContent = this.formatCurrency(0);
            return;
        }

        const total = ventasMes.reduce((sum, v) => sum + (v.monto || 0), 0);
        if (totalEl) totalEl.textContent = this.formatCurrency(total);

        tbody.innerHTML = ventasMes.map(v => {
            const fecha = v.fecha.toDate ? v.fecha.toDate() : new Date(v.fecha);
            const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `
                <tr>
                    <td>${fechaStr}</td>
                    <td>${v.descripcion || '-'}</td>
                    <td>${v.cliente || 'Sin nombre'}</td>
                    <td>${v.peluquero || '-'}</td>
                    <td><strong>${this.formatCurrency(v.monto)}</strong></td>
                </tr>
            `;
        }).join('');
    };

    console.log('Funcion renderCierre agregada a app');
}

// ==================== EXTENDER NAVEGACION ====================
function extenderNavigation() {
    const originalNavigateTo = app.navigateTo.bind(app);
    app.navigateTo = function(page) {
        originalNavigateTo(page);
        if (page === 'cierre') {
            this.renderCierre();
        }
    };
}

// Iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarExtensiones);
} else {
    inicializarExtensiones();
}
