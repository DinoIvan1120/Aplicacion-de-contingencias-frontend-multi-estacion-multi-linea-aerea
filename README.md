# AirportHub SAASA — Frontend

Sistema de Gestión de Contingencias Aeroportuarias para **Plus Ultra Airlines**.

**Stack:** React 19 · Vite · React Router v7 · TanStack React Query v5 · Axios · CSS Modules · Lucide React · STOMP WebSocket - ultra mejora

---

## Requisitos previos

- Node.js ≥ 18
- Backend SAASA corriendo en `http://localhost:8080`

---

## Instalación

```bash
npm install
```

---

## Comandos por entorno

| Comando             | Entorno           | URL backend                        |
| ------------------- | ----------------- | ---------------------------------- |
| `npm run dev`       | Desarrollo        | http://localhost:8080              |
| `npm run dev:qa`    | QA                | https://api-qa.saasa.plusultra.com |
| `npm run dev:prd`   | Producción        | https://api.saasa.plusultra.com    |
| `npm run build`     | Build producción  | https://api.saasa.plusultra.com    |
| `npm run build:dev` | Build desarrollo  | http://localhost:8080              |
| `npm run build:qa`  | Build QA          | https://api-qa.saasa.plusultra.com |
| `npm run preview`   | Preview del build | —                                  |

---

## Variables de entorno

Copia `.env.example` como `.env.dev` y ajusta los valores:

```bash
cp .env.example .env.dev
```

| Variable                | Descripción                                       |
| ----------------------- | ------------------------------------------------- |
| `VITE_API_BASE_URL`     | URL base del backend REST                         |
| `VITE_WS_URL`           | URL del WebSocket STOMP                           |
| `VITE_APP_NAME`         | Nombre de la aplicación                           |
| `VITE_ENV_LABEL`        | Etiqueta de entorno visible en el topbar (DEV/QA) |
| `VITE_QUERY_STALE_TIME` | Tiempo de stale para React Query (ms)             |

---

## Estructura del proyecto

```
src/
  api/          → Clientes HTTP por entidad (Axios)
  context/      → AuthContext + WebSocketContext
  hooks/        → Hooks de datos con React Query
  components/
    ui/         → Átomos reutilizables (Button, Modal, Badge…)
    layout/     → Sidebar, Topbar, AppLayout
    vuelos/     → Componentes específicos de vuelos
    atenciones/ → Componentes de atención al pasajero
    proveedores/→ Componentes de proveedores
    reportes/   → Tabla y filtros de reportes
  pages/        → Páginas por rol
  router/       → AppRouter + guards (PrivateRoute, RolRoute)
  utils/        → Constantes, formateadores, validadores
  styles/       → global.css con design tokens
```

---

## Roles y pantallas

| Rol             | Pantallas                                                                       |
| --------------- | ------------------------------------------------------------------------------- |
| `ADMINISTRADOR` | Dashboard, Proveedores, Usuarios, Vuelos, Reportes, Auditoría + todas las demás |
| `LIDER_SAASA`   | Registro de Vuelo, Habilitar Recursos                                           |
| `AGENTE_SAASA`  | Atención al Pasajero, Generar PDF / Email                                       |
| `LINEA_AEREA`   | Reportes                                                                        |
| `PROVEEDOR`     | Reportes                                                                        |

---

## WebSocket

El sistema se suscribe a `/topic/atenciones` para actualizaciones en tiempo real.
Cuando se recibe un evento `NUEVA_ATENCION` o `ATENCION_ANULADA`, React Query invalida
automáticamente las queries de atenciones y reportes.

---

## Backend

- **Java 17** + Spring Boot 3.3.4
- **MySQL 8** · **AWS S3** · **JWT** · **iText8** (PDF) · **STOMP** WebSocket
- Prefijo API: `/api/v1`

---

## Decisiones de diseño

- **Sin frameworks CSS externos** — todo en CSS Modules con Custom Properties
- **Sin toast / snackbar** — todos los mensajes en `InfoModal` centrado
- **Sin alert() nativo** — reemplazado por `ConfirmModal` / `InfoModal`
- **Sin llamadas directas a Axios** en componentes — solo a través de hooks
- **Design tokens** en `global.css` para consistencia visual total
