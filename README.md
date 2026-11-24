# Pilcha de Primera - Sistema de pedidos y stock

**Autora:** Abigail Canelas
**Trabajo práctico final** - Generación T, Stage 2

Sistema para el emprendimiento de indumentaria *Pilcha de Primera*: catálogo con stock, pedidos con reserva de 24 horas, descuentos, envío y cancelaciones con penalidad. Sigue el recorrido de la cursada: **spec -> base de datos -> backend con reglas -> tests -> frontend -> internet**.

Las reglas completas están en [SPEC.md](SPEC.md).

## Estructura
```
SPEC.md             reglas del sistema
backend/            Node.js + Express + PostgreSQL
  schema.sql        tablas
  src/rules.js      reglas de negocio (funciones puras)
  src/app.js        endpoints
  test/             tests de las reglas
frontend/index.html pantalla con botones que llaman al backend
```

## Cómo correrlo en local
1. Crear una base PostgreSQL (por ejemplo `pilcha`) y cargar las tablas: `psql -d pilcha -f backend/schema.sql`
2. `cd backend && cp .env.example .env` y completar los valores.
3. `npm install` y después `npm start` (queda en `localhost:3000`).
4. Abrir `frontend/index.html` en el navegador.

## Variables de entorno (`backend/.env`, no se sube al repo)
| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `ADMIN_TOKEN` | Token de la administradora |
| `FRONTEND_URL` | Dirección del frontend permitida por CORS |
| `PORT` | Puerto del backend (opcional) |

## Tests
```
cd backend
npm test
```
Los tests cubren las reglas: descuento de martes (en hora Argentina), clienta frecuente, envío gratis, vencimiento de 24 horas y penalidades de cancelación.

## Publicación (opcional)
- **Neon**: base de datos PostgreSQL (cargar `schema.sql`).
- **Render**: backend (`DATABASE_URL`, `ADMIN_TOKEN` y `FRONTEND_URL` como variables de entorno). En el plan gratuito la primera respuesta puede tardar ~30 segundos.
- **Netlify**: frontend (cambiar `API_URL` en `frontend/index.html` por la URL de Render).

Links: *(completar si se publica)*
- Frontend:
- Backend:
