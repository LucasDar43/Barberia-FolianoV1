# 💈 Barbería Foliano's — Sistema de Administración v1.0

<div align="center">

![Zenta Solutions](https://img.shields.io/badge/Zenta-Solutions-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Instalable-purple?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Tiempo%20Real-orange?style=for-the-badge)

**Sistema profesional de gestión para Barbería Foliano's**

</div>

---

## ✨ Características Principales

### 🔐 Sistema de Autenticación y Roles
- Login seguro con email y contraseña
- Dos roles diferenciados:
  - **Franco (Admin):** Acceso total al sistema
  - **Nacho (Peluquero):** Acceso limitado a sus funciones
- Registro automático de quién realiza cada acción

### ✂️ Registro de Cortes
- Tipos de servicio: Solo Corte, Corte y Barba
- Métodos de pago: Efectivo, Transferencia o **Mixto** (ambos simultáneamente)
- Precios fijos configurables con autocompletado
- Cliente opcional por corte
- Posibilidad de registrar como deuda directamente

### 🚨 Gestión de Deudores
- Lista de clientes con deuda pendiente
- Pagos parciales o totales
- Total adeudado general en tiempo real
- Historial de pagos por cliente

### 🎟️ Bonos Mensuales
- Bonos de 4 cortes por cliente
- Control de cortes usados y restantes
- Fecha de vencimiento con alertas visuales (por vencer / vencido)
- Buscador por nombre de cliente
- Historial de bonos completados

### 💵 Comisiones
- Cálculo automático por peluquero según porcentajes configurados
- Franco: 40% — Nacho: 60%
- Vista de cortes realizados y total generado por cada uno
- Historial de pagos de comisiones a Nacho

### 📋 Solicitudes
- Sistema de solicitudes entre Nacho y Franco
- Tipos: Eliminar un corte / Cobrar una deuda
- Nacho envía la solicitud → Franco aprueba o rechaza
- Badge de notificación en tiempo real en el sidebar
- Historial de solicitudes procesadas

### 💰 Cierre de Caja
- Comparación entre efectivo registrado y efectivo físico
- Detección automática de diferencias
- Campo de notas y observaciones
- Historial de cierres anteriores
- Solo visible para Franco (Admin)

### 📋 Historial
- Registro completo de todos los cortes
- Filtros por fecha y por peluquero
- Eliminación de cortes (con sistema de solicitudes para Nacho)

### ⚙️ Configuración
- Precios fijos por tipo de corte
- Porcentajes de comisión por peluquero
- Solo visible para Franco (Admin)

### 📱 PWA — Instalable como App
- Funciona en celular, tablet y PC
- Instalable en la pantalla de inicio
- Modo offline: la app sigue funcionando sin internet

---

## 👥 Roles y Accesos

| Sección | Franco (Admin) | Nacho (Peluquero) |
|---------|:--------------:|:-----------------:|
| Dashboard | ✅ | ✅ |
| Nuevo Corte | ✅ | ✅ |
| Deudores | ✅ | ✅ (solo lectura) |
| Bonos Mensuales | ✅ | ✅ |
| Comisiones | ✅ | ✅ (solo las propias) |
| Solicitudes | ✅ (aprueba) | ✅ (envía) |
| Cierre de Caja | ✅ | ❌ |
| Historial | ✅ | ✅ |
| Configuración | ✅ | ❌ |

---

## 💡 Casos de Uso

### Caso 1 — Corte simple en efectivo
```
Peluquero: Franco
Tipo: Solo Corte
Pago: Efectivo — $9.000
Cliente: Carlos López
```
El corte queda registrado en el historial y suma al total del día en caja.

---

### Caso 2 — Pago mixto
```
Peluquero: Nacho
Tipo: Corte y Barba
Pago Mixto:
  → Efectivo: $6.000
  → Transferencia: $6.000
  → Total: $12.000
```
Ambos montos se registran por separado para el cierre de caja.

---

### Caso 3 — Cliente con deuda
```
Cliente: Roberto Silva
Tipo: Corte y Barba — $12.000
Pagó hoy: $5.000
Debe: $7.000
```
**Pasos:**
1. Tildar ✅ "Registrar como deuda"
2. Ingresar monto pagado: $5.000
3. Registrar

**Resultado:** El corte queda en historial y Roberto aparece en Deudores debiendo $7.000.

---

### Caso 4 — Cobrar deuda de un cliente
```
Roberto debe: $7.000
Paga hoy: $7.000 (transferencia)
```
**Pasos:**
1. Ir a **Deudores**
2. Buscar a Roberto
3. Clic en **"Pagar"**
4. Ingresar monto y método
5. Confirmar

**Resultado:** Roberto desaparece de la lista de deudores.

---

### Caso 5 — Usar bono de cliente
```
Cliente: Ana Martínez (tiene bono activo, 2 cortes restantes)
```
**Pasos:**
1. Ir a **Bonos Mensuales**
2. Buscar a Ana
3. Clic en **"Usar Corte"**

**Resultado:** Le queda 1 corte en el bono.

---

### Caso 6 — Nacho solicita eliminar un corte
```
Nacho registró mal un corte y necesita eliminarlo
```
**Pasos (Nacho):**
1. Ir a **Solicitudes**
2. Nueva solicitud → Tipo: "Eliminar Corte"
3. Seleccionar el corte → Enviar

**Pasos (Franco):**
1. Recibe notificación en el sidebar
2. Ir a **Solicitudes**
3. Revisar y **Aprobar** o **Rechazar**

---

### Caso 7 — Cierre de caja diario
```
Efectivo registrado: $35.000
Efectivo físico contado: $34.500
```
**Pasos (Franco):**
1. Ir a **Cierre de Caja**
2. Ver total registrado en efectivo
3. Contar el dinero físico e ingresar: $34.500
4. Sistema detecta: ⚠️ Diferencia de $500
5. Agregar nota si corresponde
6. **Confirmar Cierre**

---

## 📅 Flujo Diario Recomendado

### 🌅 Inicio del día
- Ingresar al sistema
- Revisar el **Dashboard** para ver el resumen del mes
- Revisar **Deudores** pendientes
- Revisar **Solicitudes** pendientes (Franco)

### ✂️ Durante el día
- Registrar cada corte apenas se realiza
- Si el cliente tiene bono → usar en **Bonos Mensuales**
- Si el cliente queda debiendo → tildar "Registrar como deuda"
- Si un cliente paga una deuda → registrar en **Deudores**

### 🌙 Cierre del día (Franco)
1. Ir a **Cierre de Caja**
2. Verificar efectivo registrado vs físico
3. Revisar diferencias
4. Agregar notas si hace falta
5. **Confirmar Cierre** ✅

---

## 🚀 Mejoras Futuras Sugeridas

- [ ] **Exportar a PDF/Excel** — Reportes de historial y cierres de caja
- [ ] **Estadísticas avanzadas** — Gráficos de ingresos por semana/mes
- [ ] **Sistema de turnos** — Agenda con reservas de clientes
- [ ] **Notificaciones WhatsApp** — Avisar a clientes cuando el bono está por vencer
- [ ] **Control de inventario** — Productos y stock de la barbería
- [ ] **Sistema de puntos** — Fidelización de clientes frecuentes
- [ ] **Más peluqueros** — Escalar el sistema a más empleados
- [ ] **App nativa** — Versión Android/iOS publicada en tiendas

---

## 📱 Instalar como App

### Android
1. Abrir en **Chrome**
2. Menú ⋮ → **"Agregar a pantalla principal"**

### iPhone
1. Abrir en **Safari**
2. Compartir □↑ → **"Agregar a inicio"**

### PC
1. Ícono de instalación en la barra de direcciones de Chrome/Edge
2. Clic en **"Instalar"**

---

## 🔐 Seguridad

- Autenticación con Firebase Auth (encriptada)
- Control de roles y permisos por sección
- Datos almacenados en Firebase (Google Cloud)
- HTTPS en producción
- Sin acceso a datos de otros usuarios

---

<div align="center">

---

### 🙏 Agradecimientos

Gracias a **Franco** por confiar en Zenta Solutions para la digitalización de su barbería.  
Fue un placer construir este sistema con ustedes.

---

**Sistema desarrollado por Zenta Solutions**

© 2026 Zenta Solutions. Todos los derechos reservados.  
Sistema licenciado para uso exclusivo de **Barbería Foliano's**.


</div>
