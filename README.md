# Inventario Mercado Libre MX

App base en Next.js (App Router) con autenticacion por email/contrasena, roles, Prisma y Postgres local. Incluye:
- Sincronizacion pensada para stock y precio con Mercado Libre (MX), listo para webhooks.
- Pausa automatica al llegar a stock 0 (luego de implementar la sync real con ML).
- Roles: admin, operador, lectura (extensible).
- Auditoria basica y notificaciones en la UI (stubs).
- Importa/crea inventario, muestra todos los campos y permite borrar registros individual o masivamente desde la tabla.

## Campos soportados en importacion
- Encabezados: ESTATUS, DESCRIPCION, DESCRIPCION LOCAL, DESCRIPCION ML, PRECIO, CODIGO, STOCK, CODIGO UNIVERSAL, CODIGO DE MERCADO LIBRE, ESTATUS INTERNO, ORIGEN, MARCA, COCHE, AÑO DESDE, AÑO HASTA, UBICACION, FACEBOOK, PIEZA.
- La plantilla Excel incluye listas desplegables para ESTATUS, ESTATUS INTERNO, ORIGEN; MARCA, COCHE, AÑOS, UBICACION, FACEBOOK y DESCRIPCION LOCAL se pueden capturar libremente para permitir nuevas opciones.

## Requisitos
- Node 18+
- Postgres local

## Variables de entorno
Copia `.env.example` a `.env` y completa:
- `DATABASE_URL` (Postgres local)
- `NEXTAUTH_SECRET`
- Credenciales ML (`ML_APP_ID`, `ML_APP_SECRET`, `ML_REDIRECT_URI`, `ML_WEBHOOK_SECRET`)

## Scripts
- `npm install`
- `npm run db:push` (crea tablas Prisma)
- `npm run dev` (http://localhost:3000)
- `npm run lint`
- `npm run test`

## Flujo basico
1) `npm install`
2) Configura `.env`
3) `npm run db:push`
4) `npm run dev`
5) Crea usuario en `/registro` y luego ingresa en `/login`

## Notas de sync Mercado Libre
- Se mapea SKU interno a `seller_custom_field` y opcionalmente `mlItemId`.
- Webhooks recomendados para tiempo real; agrega endpoint y valida `ML_WEBHOOK_SECRET`.
- Conflictos: la app es la fuente de verdad (sobrescribe ML).

## Pendiente
- Endpoints de webhooks ML y jobs de refuerzo.
- Importar Excel y personalizar encabezados (parcial: ya se importa con encabezados basicos).
- UI de notificaciones y auditoria.
- Soporte multi-cuenta ML futuro.
