# ZitaJobs 🏢

Plataforma de empleos para Zitácuaro, Michoacán.

## Arquitectura preparada para deploy gratuito

- **Frontend:** Vercel (sitio estático gratuito).
- **Backend:** Render Web Service Free (Node.js/Express).
- **Base de datos:** Supabase PostgreSQL Free.
- **Storage:** Supabase Storage Free (`logos` público y `cvs` privado mediante URLs firmadas).
- **Autenticación:** JWT.

> El frontend y el backend son independientes. El backend nunca expone la `SUPABASE_SERVICE_ROLE_KEY` al navegador.

### Importante sobre los planes gratuitos

Los planes gratuitos cambian con el tiempo y tienen límites. Render indica actualmente que sus Web Services Free se suspenden después de 15 minutos sin tráfico y vuelven a arrancar con la siguiente petición; además, el filesystem local es efímero. Por eso ZitaJobs ya no guarda la base de datos ni los uploads en disco local. Render también ofrece PostgreSQL Free, pero esa base expira después de 30 días, por lo que este proyecto usa Supabase para la persistencia principal.

## Estructura

```text
zitajobs/
├── backend/
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── storage.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── vercel.json
│   ├── src/js/config.js
│   └── ...
├── render.yaml
└── start.sh
```

## Variables del backend

Copia `backend/.env.example` a `.env` para desarrollo. En Render, configura las mismas variables desde Environment.

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DB_POOL_MAX=5
JWT_SECRET=...
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://TU-FRONTEND.vercel.app
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_CV_BUCKET=cvs
SUPABASE_LOGO_BUCKET=logos
MAX_FILE_SIZE_MB=5
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
SEED_DEMO_DATA=false
```

Genera el JWT secret con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Supabase

1. Crea un proyecto gratuito en Supabase.
2. Copia la cadena de conexión PostgreSQL y colócala en `DATABASE_URL`.
3. Ejecuta `backend/database/schema.sql` en el SQL Editor. El backend también intenta crear las tablas al arrancar.
4. En Storage crea dos buckets:
   - `logos`: **público**.
   - `cvs`: **privado**.
5. Copia `Project URL` a `SUPABASE_URL`.
6. Copia la **Service Role Key** únicamente al backend de Render.

No coloques la Service Role Key en ningún archivo del frontend.

## Deploy del backend en Render

1. Sube el proyecto a GitHub.
2. En Render selecciona **New → Web Service** y conecta el repositorio.
3. Si usas `render.yaml`, Render puede usar la configuración incluida.
4. Si lo configuras manualmente:
   - Root Directory: `backend`
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Plan: `Free`
   - Health Check: `/api/health`
5. Añade las variables de entorno.
6. El backend debe quedar en una URL como:

```text
https://zitajobs-api.onrender.com
```

Si eliges otro nombre, cambia `frontend/src/js/config.js`:

```js
window.ZITAJOBS_API_URL = 'https://TU-SERVICIO.onrender.com/api';
```

## Deploy del frontend en Vercel

1. Importa el mismo repositorio en Vercel.
2. Selecciona `frontend` como **Root Directory**.
3. No necesitas build command: es un sitio estático.
4. Deploy.
5. Copia la URL de Vercel a `FRONTEND_URL` en Render.
6. Haz un nuevo deploy del backend después de cambiar `FRONTEND_URL`.

## Storage

Los CV y logos ya no se guardan en `backend/uploads`.

- Logos: Supabase Storage, bucket `logos`.
- CV: Supabase Storage, bucket `cvs` privado.
- Los CV se entregan mediante URLs firmadas temporales y solo después de comprobar permisos.

Esto evita perder archivos cuando Render reinicia o vuelve a desplegar el backend.

## Desarrollo local

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

El frontend puede abrirse con Live Server o cualquier servidor estático.

Para cargar datos de demostración de forma local:

```bash
SEED_DEMO_DATA=true npm start
```

Las cuentas demo solo deben utilizarse en desarrollo. No se recomienda habilitar `SEED_DEMO_DATA` en producción.

## Health check

```text
GET /api/health
```

Debe responder con `database: "connected"`.

## Estado del proyecto

La aplicación fue adaptada para:

- PostgreSQL persistente en lugar de base de datos en memoria.
- Supabase Storage en lugar del filesystem efímero de Render.
- CV privados con URLs firmadas.
- Logos públicos mediante CDN de Supabase.
- Backend escuchando en `0.0.0.0` para Render.
- Puerto configurable mediante `PORT`.
- URL del backend configurable desde `frontend/src/js/config.js`.
- CORS restringido a la URL del frontend.
- Rate limiting y Helmet conservados.
- `render.yaml` incluido para simplificar el despliegue.

## Límites del free tier

Esta arquitectura está pensada para **MVP, portafolio, pruebas y tráfico pequeño**. Antes de utilizarla para un servicio con usuarios reales a escala, revisa los límites actuales de cada proveedor y configura backups/monitorización apropiados.
