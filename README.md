# 💈 Barbería Foliano's — Sistema de Administración

<div align="center">

![Zenta Solutions](https://img.shields.io/badge/Zenta-Solutions-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-production-brightgreen?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-orange?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-purple?style=for-the-badge)

**Sistema web PWA de gestión integral para barbería**

[Demo](#-demo) • [Funcionalidades](#-funcionalidades) • [Tecnologías](#-tecnologías) • [Instalación](#-instalación) • [Estructura](#-estructura-del-proyecto)

</div>

---

## 🔗 Demo

🌐 [https://barberia-folianosv1.firebaseapp.com](https://barberia-folianosv1.firebaseapp.com)

---

## 📋 Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Autenticación** | Login con Firebase Auth, roles Admin y Peluquero |
| ✂️ **Nuevo Corte** | Registro con tipo, peluquero, método de pago y monto |
| 🚨 **Deudores** | Control de clientes con deuda, pagos parciales o totales |
| 🎟️ **Bonos Mensuales** | Bonos de 4 cortes por cliente con vencimiento y alertas |
| 💵 **Comisiones** | Cálculo automático por peluquero con historial de pagos |
| 📋 **Solicitudes** | Sistema de aprobación entre peluquero y admin |
| 💰 **Cierre de Caja** | Comparación efectivo registrado vs físico con historial |
| 📋 **Historial** | Registro completo con filtros por fecha y peluquero |
| ⚙️ **Configuración** | Precios fijos y porcentajes de comisión |
| 📱 **PWA** | Instalable, modo offline con Service Worker |

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| HTML5 / CSS3 / JavaScript ES6+ | Frontend vanilla sin frameworks |
| Firebase Authentication | Login y gestión de sesiones |
| Firebase Firestore | Base de datos en tiempo real |
| Firebase Hosting | Deploy y hosting |
| Service Worker + Manifest | PWA, modo offline e instalación |

---

## 👥 Roles y Permisos

| Sección | Admin (Franco) | Peluquero (Nacho) |
|---------|:--------------:|:-----------------:|
| Dashboard | ✅ | ✅ |
| Nuevo Corte | ✅ | ✅ |
| Deudores | ✅ | ✅ |
| Bonos Mensuales | ✅ | ✅ |
| Comisiones | ✅ | ✅ (solo propias) |
| Solicitudes | ✅ (aprueba) | ✅ (envía) |
| Cierre de Caja | ✅ | ❌ |
| Historial | ✅ | ✅ |
| Configuración | ✅ | ❌ |

---

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/barberia-folianos.git
cd barberia-folianos
```

### 2. Configurar Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activar **Authentication** → Email/Password
3. Activar **Firestore Database**
4. Activar **Hosting**
5. Reemplazar `firebaseConfig` en `index.html` y `app.js`:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.firebasestorage.app",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

### 3. Crear usuarios en Firebase Auth

Firebase Console → Authentication → Users → Agregar usuario.

### 4. Crear perfil en Firestore

Colección `users`, documento con ID = UID del usuario:

```json
{
  "name": "Franco",
  "role": "admin",
  "email": "franco@barberia.com"
}
```

Roles: `admin` o `peluquero`

### 5. Reglas de Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Deploy

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## 📁 Estructura del Proyecto

```
barberia-folianos/
├── index.html              # Pantalla de login
├── app.html                # Aplicación principal
├── app.js                  # Lógica principal del sistema
├── extensiones.js          # Módulo de cierre de caja
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker (offline)
├── firebase.json           # Configuración Firebase Hosting
├── .gitignore
├── README.md
├── css/
│   ├── styles.css
│   ├── login.css
│   └── nuevas-secciones.css
└── assets/
    ├── logo.png
    └── favicon.png
```

---

## 📱 PWA — Instalar como App

- **Android:** Chrome → ⋮ → Agregar a pantalla principal
- **iPhone:** Safari → Compartir → Agregar a inicio
- **PC:** Ícono de instalación en la barra de Chrome/Edge

---

## 🌿 Git Flow

- `main` — Producción (código estable)
- `develop` — Desarrollo
- `feature/*` — Nuevas funcionalidades
- `bugfix/*` — Corrección de bugs

### Convención de commits

```bash
git commit -m "feat: nueva funcionalidad"
git commit -m "fix: corrección de bug"
git commit -m "docs: actualización de documentación"
git commit -m "style: cambios de estilos"
git commit -m "refactor: refactorización"
```

---

## 🚀 Mejoras Futuras

- [ ] Exportar historial a PDF/Excel
- [ ] Estadísticas con gráficos por período
- [ ] Sistema de turnos y agenda
- [ ] Notificaciones por WhatsApp
- [ ] Control de inventario
- [ ] Sistema de fidelización / puntos
- [ ] Soporte para más peluqueros

---

## 📄 Licencia

© 2026 **Zenta Solutions**. Todos los derechos reservados.  
Sistema desarrollado y licenciado para uso exclusivo de **Barbería Foliano's**.

---

<div align="center">

**Desarrollado con ❤️ por Zenta Solutions**

</div>
