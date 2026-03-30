# 🌊 Galizano Reusa

**Plataforma de economía circular para reutilización de objetos en zonas de playa.**

Gagit 

---

## Arquitectura Funcional

| Módulo | Descripción |
|--------|-------------|
| **Gestión de Usuarios** | Registro de clientes (exentos de fianza), ofertantes (anónimos, con IBAN) e invitados |
| **Inventario / Catálogo** | CRUD de artículos con fotos, descripción, precios y fianza configurable |
| **Motor QR** | Generación automática de QR por artículo → landing page dinámica |
| **Pasarela de Pagos** | Integración con Stripe Checkout (cobro + fianza como línea separada) |
| **Auditoría / Devoluciones** | Check-in temporal, retardo de 24h para fianza, gestión de incidencias |

## Stack Tecnológico

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (dev) / PostgreSQL (prod) vía Prisma ORM
- **Vistas:** EJS + Tailwind CSS (CDN)
- **Pagos:** Stripe Checkout API
- **QR:** qrcode (npm)
- **Seguridad:** Helmet, CSRF tokens, bcrypt, rate limiting, express-validator

## Estructura del Proyecto

```
├── prisma/
│   ├── schema.prisma          # Modelo de datos
│   ├── seed.js                # Datos de demostración
│   └── migrations/
├── src/
│   ├── app.js                 # Entry point + middleware
│   ├── config/
│   │   ├── database.js        # Prisma client
│   │   └── stripe.js          # Stripe client
│   ├── middleware/
│   │   ├── auth.js            # Guards de autenticación
│   │   └── upload.js          # Multer (subida de fotos)
│   ├── routes/
│   │   ├── auth.js            # Login / Registro
│   │   ├── items.js           # CRUD de artículos
│   │   ├── landing.js         # Landing pública (/o/:slug)
│   │   ├── payments.js        # Checkout Stripe
│   │   ├── dashboard.js       # Panel del ofertante
│   │   └── webhooks.js        # Webhooks de Stripe
│   ├── services/
│   │   ├── qrService.js       # Generación de QR
│   │   └── depositService.js  # Gestión de fianzas
│   └── views/
│       ├── layouts/           # main.ejs, landing.ejs
│       ├── auth/              # login, registro-cliente, registro-ofertante
│       ├── items/             # crear, editar, qr
│       ├── landing/           # objeto.ejs (landing del QR)
│       ├── dashboard/         # index, devoluciones
│       ├── payments/          # exito.ejs
│       ├── home.ejs
│       └── error.ejs
└── public/
    └── uploads/               # Fotos de artículos
```

## Instalación y Puesta en Marcha

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd galizano-reusa
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus claves de Stripe y un SESSION_SECRET seguro
```

### 3. Inicializar la base de datos

```bash
npx prisma migrate dev
npm run db:seed
```

### 4. Arrancar la aplicación

```bash
npm run dev    # Desarrollo (con nodemon)
npm start      # Producción
```

La app estará disponible en `http://localhost:4001`

### Credenciales de demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Ofertante | ofertante@demo.com | password123 |
| Cliente | cliente@demo.com | password123 |

## Flujos Principales

### Ofertante
1. Registrarse → Subir objeto con fotos → Configurar precio y fianza
2. Imprimir QR → Colocar junto al objeto en la playa
3. Revisar devoluciones → Confirmar estado o reportar incidencia

### Cliente (registrado)
1. Escanear QR → Ver landing del objeto → Elegir tarifa → Pagar (sin fianza)

### Invitado (sin registro)
1. Escanear QR → Ver landing → Elegir tarifa → Pagar (alquiler + fianza reembolsable)

## Configuración de Stripe (Producción)

1. Crear cuenta en [Stripe Dashboard](https://dashboard.stripe.com)
2. Obtener claves API (`sk_live_...`, `pk_live_...`)
3. Configurar webhook endpoint: `https://tudominio.com/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `payment_intent.payment_failed`
4. Actualizar `.env` con las claves reales

## Licencia

MIT
