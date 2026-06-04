# Sistema de Contratos Proposal Inc — Plan de Implementación

> **Para sesiones de implementación:** Leer el ContextoMaster completo antes de tocar cualquier archivo: `/Users/brunogutierrez/Documents/CLAUDE CODE/Proposal Inc/02. contratos/01. VERSION 1.0/ContextoMaster_v1.md`. Usar como referencia principal el sistema de Inmuebles Audiovisuales en `/Users/brunogutierrez/Documents/CLAUDE CODE/Inmuebles WEBSITE/02. contratos/05. VERSION 3.0 /` (la carpeta tiene un espacio al final del nombre).

**Meta:** Construir un sistema completo de contratos digitales para Proposal Inc que reemplace el flujo Google Forms → Adobe Sign con un portal propio de firma, seguimiento de pagos y entrega de material.

**Arquitectura:** Backend en Google Apps Script con base de datos en Google Sheets. Frontend en tres HTMLs estáticos alojados en GitHub + Cloudflare Pages. El cliente recibe un link único (`portal.html?token=XXX`) para firmar, pagar y recibir su material. Bruno y su equipo gestionan todo desde `admin.html`.

**Stack técnico:** Google Apps Script, Google Sheets, Google Drive, Google Calendar (opcional), Gmail, HTML/CSS/JS vanilla, GitHub CLI, Cloudflare Pages.

---

## Estado actual

Los cuatro archivos de código (`setup.js`, `ScriptContratos1_v1.js`, `admin.html` y `portal.html`) están escritos en `02. contratos/01. VERSION 1.0/` y pasaron seis rondas de auditoría. Todos los bugs críticos e importantes fueron corregidos. Los cambios acumulados respecto a la versión inicial incluyen: estructura de carpetas Drive por año y mes bajo `02. Proyectos`; cuestionario del cliente (NombrePareja, CancionEvento, FamiliaAsiste, FamiliaNumero, AlergiasAlimentarias); separación de AddonsOfrecidosJSON; locacionDisplay neutral en portal; campo editable de espacio en admin; validación de fecha en accionCrearContrato1; LockService en procesarPDFsPendientes1; corrección de RecordatorioEnviado como ISO timestamp; validación de estatus en accionGuardarEntrega1; verificación de tipo de token en accionObtenerPortal1; placeholder firma limpiado si archivo no disponible; y múltiples correcciones de campos condicionales en correos. En los correos automáticos el encabezado sigue siendo texto hasta que el logo tenga una URL pública. Lo que falta es la puesta en marcha y las pruebas, descritas en la sección "Orden de ejecución" al final de este documento.

---

## Archivos a crear

| Archivo | Ruta destino | Responsabilidad |
|---------|-------------|-----------------|
| `setup.js` | Ejecutar en Apps Script (una sola vez) | Crea Sheets, carpetas Drive, template de contrato, puebla Paquetes1 |
| `ScriptContratos1_v1.js` | Desplegar en Apps Script | Backend completo: endpoints, triggers, correos, PDF |
| `admin.html` | Repo GitHub → Cloudflare Pages | Panel de Bruno, Fernanda y Danna |
| `portal.html` | Repo GitHub → Cloudflare Pages | Portal del cliente: firma, pago, entrega |

**Archivos de referencia a leer antes de cada fase:**

- `ScriptContratos3_v1.js` — base del script v1 de Proposal Inc
- `admin.html` de Inmuebles — base del admin de Proposal Inc
- `portal.html` de Inmuebles — base del portal de Proposal Inc

---

## Diferencias clave respecto a Inmuebles v3.0

Estas diferencias deben aplicarse al adaptar el código de Inmuebles. Todo lo demás es igual.

| Aspecto | Inmuebles v3.0 | Proposal Inc v1 |
|---------|---------------|-----------------|
| Tipos de contrato | Estándar / Particular | Estándar / personalizado |
| Propiedades múltiples | Sí (hoja Propiedades3) | No — un evento por contrato |
| Folio | `IAV-YYMM.DD` | `PI-YYMM.DD`, con sufijo `-APELLIDO` si hay varios eventos el mismo día |
| Add-ons | Sí (cliente selecciona al firmar) | Sí — misma mecánica que Inmuebles |
| Pago con tarjeta | Sí (Clip) | No — solo transferencia y depósito |
| Locación | Dirección libre | Catálogo fijo: Safi (2 espacios) o Rincón (4 espacios) |
| Restricción de locación | Ninguna | Isla nunca disponible sábados; Safi sin alcohol domingos |
| Entrega express | Add-on | Incluida en paquetes Premium automáticamente |
| Usuarios admin | Solo Bruno | Bruno, Fernanda, Danna (misma contraseña) |
| Configurar cotización | Existe (configurar3.html) | No existe |
| Checklist de rodaje | Existe (checklist.html) | No existe (en esta versión) |

---

## Tipo de contrato `personalizado`

Además del contrato `estandar` (paquete del catálogo), existe el tipo `personalizado` para eventos en locaciones fuera del catálogo. En `personalizado` todo se captura a mano: locación, espacio, descripción del servicio, precio y anticipo. No hay selector de catálogo ni add-ons. El admin muestra un formulario simplificado cuando se elige este tipo. La columna `TipoContrato` de `Contratos1` guarda `estandar` o `personalizado`. Ver la sección "Cotizaciones personalizadas" del ContextoMaster para el detalle completo.

---

## Fase 1 — setup.js

**Objetivo:** Crear toda la infraestructura de Google (Sheets, Drive, template) con un solo script que se ejecuta una vez.

**Archivos:**
- Crear: `setup.js` (se ejecuta en Apps Script, no va a GitHub)

### Tarea 1.1 — Escribir setup.js

Basarse en el `setup.js` de Inmuebles. Adaptar los siguientes puntos:

- [ ] Nombre de la carpeta raíz en Drive: `Proposal Inc — Sistema v1.0`
- [ ] Nombre del Sheets: `Contratos v1 — Proposal Inc`
- [ ] Hojas a crear: `Contratos1`, `Tokens1`, `Abonos1`, `Paquetes1`
- [ ] Columnas de `Contratos1`: Token, Folio, TipoContrato, NombreCliente, CorreoCliente, TelefonoCliente, PaqueteClave, PaqueteNombre, AdicionalesJSON, Locacion, EspacioLocacion, DescripcionServicio, Precio, Anticipo, SaldoPendiente, Estatus, FechaCreacion, FechaEvento, HoraEvento, FechaFirma, FechaUltimoAbono, FechaEntrega, FirmaBase64URL, PdfContratoUrl, EntregaDriveLink, EntregaLinksExtra, CarpetaProyectoID, NotasContrato, NotasInternas, SesionCompletada, RecordatorioEnviado, FotografiaLista, VideoListo, EntregaRevocada, Oculto
- [ ] Columnas de `Tokens1`: Token, ContratoID, Tipo, Expira, Usado
- [ ] Columnas de `Abonos1`: ID, ContratoToken, Monto, Metodo, Fecha, FechaRegistro, Notas
- [ ] Columnas de `Paquetes1`: Clave, Locacion, Nombre, Precio, EsAdicional, Entregables, Activo, Orden
- [ ] Poblar `Paquetes1` con los 12 paquetes del catálogo (ver sección "Paquetes del catálogo" en ContextoMaster)
- [ ] Crear template de contrato en Google Docs con los 15 placeholders (ver sección "Contrato — campos del template" en ContextoMaster) y las 15 cláusulas del contrato original (ver `/Users/brunogutierrez/Documents/CLAUDE CODE/Proposal Inc/02. contratos/01. VERSION 1.0/Template contrato-2.docx`)
- [ ] Al final del log: imprimir ID de la carpeta, ID del Sheets, ID del template, para anotarlos en CONFIG1

### Tarea 1.2 — Ejecutar setup.js (Bruno lo hace)

- [ ] Abrir script.google.com con la cuenta proposalincmx@gmail.com
- [ ] Pegar el contenido de setup.js en el editor
- [ ] Ejecutar la función `instalar()`
- [ ] Copiar los IDs del log y pegarlos en el chat para verificar
- [ ] Anotar los IDs en la sección "Infraestructura" del ContextoMaster_v1.md

---

## Fase 2 — ScriptContratos1_v1.js

**Objetivo:** Backend completo en Apps Script. Todos los endpoints que admin.html y portal.html necesitan.

**Archivos:**
- Crear: `ScriptContratos1_v1.js` (se despliega en Apps Script, no va a GitHub)

**Referencia:** Leer `ScriptContratos3_v1.js` completo antes de escribir este archivo. La estructura es idéntica; solo se adaptan los nombres (`3` → `1`, `CONFIG3` → `CONFIG1`, etc.) y se eliminan/modifican las partes que no aplican (ver tabla de diferencias).

### Tarea 2.1 — CONFIG1 y constantes

- [ ] Definir `CONFIG1` con: SHEET_ID, HOJA_CONTRATOS, HOJA_TOKENS, HOJA_ABONOS, HOJA_PAQUETES, TEMPLATE_CONTRATO_ID, CARPETA_SISTEMA_ID, ADMIN_KEY, EMAIL_ADMIN, WHATSAPP_URL, CLABE, CUENTA, TITULAR
- [ ] Definir `COLS_CONTRATOS1` como array con los 35 nombres de columna exactos (en el mismo orden que las columnas del Sheets)
- [ ] Definir `ACCIONES_ADMIN1` (Set) y `ACCIONES_ADMIN_GET1` (Set) con todas las acciones protegidas por adminKey

### Tarea 2.2 — Helpers y utilidades

Copiar y adaptar de Inmuebles (cambiar sufijo `3` → `1`):

- [ ] `getHoja1(nombre)` — obtiene hoja del Sheets por nombre
- [ ] `getContratos1()`, `getTokens1()`, `getAbonos1()`, `getPaquetes1()`
- [ ] `obtenerContrato1(token)` — busca fila en Contratos1 por Token
- [ ] `actualizarContrato1(token, cambios)` — actualiza campos específicos de un contrato
- [ ] `crearFilaContrato1(datos)` — inserta fila nueva en Contratos1, posicional según COLS_CONTRATOS1
- [ ] `sanitizarParaSheets(val)` — previene inyección de fórmulas
- [ ] `htmlEsc1(str)` — escapa HTML para correos
- [ ] `parseFecha(str)` — agrega `T12:00:00` a strings de fecha sin hora (evita desfase UTC)
- [ ] `formatFechaEspanol1(fecha)` — formatea fecha en español (ej: "sábado 21 de mayo de 2026")
- [ ] `generarFolio1(fechaEvento, nombreCliente, contratos)` — genera `PI-YYMM.DD`. Si ya existe otro contrato con la misma fecha base, agrega el primer apellido del cliente como sufijo: `PI-YYMM.DD-GARCIA`. Si el primer contrato del día aún no tiene sufijo y llega un segundo, el sistema actualiza el primero agregándole su apellido y genera el nuevo con el suyo. Esto evita el problema de reindexar números. El apellido se extrae tomando la segunda palabra de `NombreCliente` (o la última si hay más de dos).
- [ ] `obtenerPaquete1ByClave(clave)` — busca paquete en Paquetes1
- [ ] `obtenerPaquetesActivos1()` — lista todos los paquetes activos
- [ ] `esSi1(val)` — igual que en v3, reconoce `'Sí'`, `'SI'`, `'SÍ'`, `true`, `'TRUE'`

### Tarea 2.3 — Endpoints de contratos

- [ ] `accionCrearContrato1(body)` — crea contrato nuevo. Campos requeridos: NombreCliente, CorreoCliente, TelefonoCliente, PaqueteClave, AdicionalesJSON, Locacion, EspacioLocacion, FechaEvento, HoraEvento, Precio, Anticipo. Genera folio con apellido como sufijo si hay otro evento ese día (y actualiza el folio del contrato anterior si era el único del día). Token UUID, inserta en Contratos1, crea token de portal en Tokens1. Estatus inicial: `Pendiente firma`.
- [ ] `accionListarContratos1(e)` — lista contratos no ocultos. Devuelve: token, folio, nombreCliente, paqueteNombre, locacion, espacioLocacion, precio, saldoPendiente, estatus, fechaEvento, horaEvento, fechaFirma, fechaUltimoAbono, fechaEntrega, fotografiaLista, videoListo.
- [ ] `accionObtenerContrato1(e)` — detalle completo de un contrato para el panel lateral del admin.
- [ ] `accionActualizarEstatus1(body)` — cambia estatus manualmente desde el admin.
- [ ] `accionOcultarContrato1(body)` — borrado suave: `Oculto = true`.
- [ ] `accionEliminarContrato1(body)` — borrado permanente en cascada: Contratos1, Abonos1, Tokens1.
- [ ] `accionGuardarNotasInternas1(body)` — guarda NotasInternas del contrato.
- [ ] `accionMarcarSesionCompletada1(body)` — guarda timestamp en SesionCompletada, cambia estatus a `En produccion`. No envía correo.
- [ ] `accionGuardarProduccion1(body)` — guarda FotografiaLista, VideoListo con sello de tiempo. Conserva sello previo si ya estaba marcado.
- [ ] `accionGuardarEntrega1(body)` — guarda links Drive en EntregaDriveLink y EntregaLinksExtra, cambia estatus a `Entregado`, envía correo al cliente.
- [ ] `accionRevocarEntrega1(body)` — pone o limpia EntregaRevocada.
- [ ] `accionExportarCSV1(e)` — genera CSV con columnas básicas, excluye ocultos.

### Tarea 2.4 — Endpoints de paquetes y stats

- [ ] `accionListarPaquetes1(e)` — paquetes activos para el portal y el admin.
- [ ] `accionListarPaquetesAdmin1(e)` — todos los paquetes (activos e inactivos) para gestión en admin.
- [ ] `accionCrearPaquete1(body)`, `accionActualizarPaquete1(body)`, `accionTogglePaquete1(body)`
- [ ] `accionListarStats1(e)` — estadísticas por período (mes/trimestre/año/todo): facturado, cobrado, por cobrar, ticket promedio, contratos por estatus, top 5 clientes, facturación últimos 6 meses.

### Tarea 2.5 — Firma y abonos

- [ ] `accionManejarFirmaCliente1(body)` — procesa firma del portal. Guarda PNG temporal en Drive, actualiza estatus a `Firmado` (o `En produccion` si anticipo=0), notifica a Bruno por correo. No genera PDF aquí. Proteger con LockService.
- [ ] `accionRegistrarAbono1(body)` — registra abono en Abonos1, actualiza SaldoPendiente y FechaUltimoAbono en Contratos1. Si saldo llega a 0: cambia estatus a `Liquidado`. Si es el primer abono: crea carpeta en Drive (`PI-YYMM.DD-APELLIDO — NombreCliente/Fotos/` y `…/Video/`), guarda ID en `CarpetaProyectoID`. Envía correo de confirmación al cliente. Proteger con LockService. Guard: verificar `!contrato.CarpetaProyectoID` antes de crear carpeta para no duplicar.
- [ ] `accionObtenerPortal1(e)` — devuelve estado y datos del contrato para el portal. Verifica validez del token. Incluye: datos del cliente, paquete, locacion, espacio, fechaEvento, horaEvento, precio, anticipo, saldoPendiente, estatus, pdfContratoUrl, entregaDriveLink, entregaLinksExtra, notasContrato, entregaRevocada.

### Tarea 2.6 — Triggers y correos

- [ ] `procesarPDFsPendientes1()` — trigger cada minuto. Busca contratos con FechaFirma y sin PdfContratoUrl. Genera PDF desde el template de Google Docs, lo guarda en Drive, guarda URL en PdfContratoUrl, envía correo al cliente con PDF adjunto, borra PNG temporal. Límite de 4 minutos por ejecución.
- [ ] `recordatorio24h1()` — trigger horario. Busca contratos con FechaEvento = mañana y RecordatorioEnviado distinto a mañana. Envía correo de recordatorio. Guarda fecha en RecordatorioEnviado.
- [ ] `detectarPDFsAtascados1()` — trigger diario a las 9 AM. Alerta a Bruno si hay contratos firmados sin PDF después de 15 minutos.
- [ ] `correoFirmaAdmin1(contrato)` — notifica a Bruno que un contrato fue firmado.
- [ ] `correoPDFCliente1(contrato, pdfBlob)` — envía PDF al cliente con detalles del evento.
- [ ] `correoConfirmacionAbono1(contrato)` — confirma al cliente que se recibió el anticipo. Incluye fecha, hora, locación y espacio del evento.
- [ ] `correoEntregaCliente1(contrato)` — notifica al cliente que su material está listo, con link de Drive.
- [ ] `correoRecordatorio24h1(contrato)` — recordatorio del evento mañana con hora y locación.

### Tarea 2.7 — doGet, doPost y routing

- [ ] `doGet(e)` — enruta acciones GET: listarContratos, listarPaquetes, obtenerPortal, obtenerContrato, listarStats, listarPaquetesAdmin, exportarCSV. Verifica adminKey para acciones de admin.
- [ ] `doPost(e)` — enruta acciones POST: crearContrato, registrarAbono, guardarEntrega, manejarFirmaCliente, actualizarEstatus, ocultarContrato, eliminarContrato, guardarNotasInternas, marcarSesionCompletada, guardarProduccion, revocarEntrega, crearPaquete, actualizarPaquete, togglePaquete.
- [ ] Desplegar en Apps Script: Implementar → Nueva versión → URL de tipo "Anyone, even anonymous". Anotar la URL en ContextoMaster_v1.md.

### Tarea 2.8 — Configurar triggers en Apps Script

- [ ] `procesarPDFsPendientes1` — disparador por tiempo, cada minuto.
- [ ] `recordatorio24h1` — disparador por tiempo, cada hora.
- [ ] `detectarPDFsAtascados1` — disparador por tiempo, diario entre 9:00 y 10:00 AM.

### Tarea 2.9 — Verificación del backend (Bruno ejecuta)

- [ ] Desde el editor de Apps Script, ejecutar `instalarTriggers1()` (función que configura los tres triggers).
- [ ] Crear un contrato de prueba llamando `crearContrato` manualmente desde el editor.
- [ ] Verificar que aparece en el Sheets.
- [ ] Verificar que el folio se generó en formato `PI-YYMM.DD`.

---

## Fase 3 — admin.html

**Objetivo:** Panel de control para Bruno, Fernanda y Danna.

**Archivos:**
- Crear: `admin.html` → subir a GitHub → despliega en Cloudflare Pages

**Referencia:** Leer `admin.html` de Inmuebles completo antes de escribir. Adaptar eliminando lo que no aplica (no hay tipo de contrato, no hay múltiples propiedades, no hay configurar, no hay checklist de rodaje).

### Tarea 3.1 — Estructura base y login

- [ ] `<!DOCTYPE html>` con Montserrat desde Google Fonts
- [ ] Variables CSS: `--onyx: #1C1C1E`, `--gold: #C9A84C` (heredado de Inmuebles hasta que Proposal defina su propia paleta)
- [ ] Pantalla de login: campo de contraseña, botón mostrar/ocultar, logo de Proposal Inc
- [ ] `localStorage` para persistir sesión entre recargas
- [ ] `PASSWORD` como constante al inicio del script

### Tarea 3.2 — Stats bar y alerta de evento hoy

- [ ] Barra de 5 tarjetas: contratos activos, facturado (mes), cobrado (mes), por cobrar, eventos esta semana
- [ ] Alerta dorada cuando hay evento programado para hoy
- [ ] Responsive: 2x2 en mobile, 5ta tarjeta ocupa ancho completo si queda sola

### Tarea 3.3 — Lista de contratos y filtros

- [ ] Tabla con columnas: folio, cliente, paquete, locación/espacio, estatus (con días en ese estatus), precio, saldo, fecha del evento
- [ ] Icono de alerta si lleva más de 60 horas en "Pendiente firma"
- [ ] Filtros: búsqueda por texto, filtro por estatus, filtro por período (abiertos/todos), rango de fechas
- [ ] Filtros colapsables en mobile

### Tarea 3.4 — Formulario de nuevo contrato

**Tipo de contrato:** selector `estandar` / `personalizado`. Con `personalizado` el formulario reemplaza el selector de paquete, locación y espacio del catálogo por campos manuales (locación libre, espacio libre, descripción libre) y el precio se captura a mano sin autocompletar. No se ofrecen add-ons en contratos `personalizado`.

Campos:
- [ ] Nombre completo del cliente
- [ ] Correo electrónico
- [ ] Teléfono
- [ ] Paquete (select dinámico desde `listarPaquetes`) — al seleccionar, auto-llena precio base
- [ ] Add-ons disponibles (checkboxes dinámicos desde `listarPaquetes`, filtrados por `EsAdicional=true`). Todos marcados por defecto; Bruno desmarca los que no apliquen. Los checkboxes NO afectan el precio del contrato — solo determinan qué add-ons verá el cliente en el portal para aceptar o rechazar.
- [ ] Locación (select: Safi Metropolitan / Rincón de Santiago / Otro)
- [ ] Espacio de la locación (select dinámico según locación elegida):
  - Safi: Terraza Principal, Terraza Condominios
  - Rincón: Auditorio, Isla, Terraza, Área de yoga
- [ ] Fecha del evento (date picker)
- [ ] Hora del evento (time picker)
- [ ] Precio total (autocompletado con el precio base del paquete, editable)
- [ ] Anticipo (default 50% del precio total, editable en pesos — solo se auto-llena al seleccionar paquete, nunca al editar el precio)
- [ ] Notas del contrato (texto libre opcional, visible al cliente en el portal)
- [ ] Advertencia visual si: (a) se elige Isla en Rincón un sábado, o (b) se elige Safi un domingo (sin alcohol)
- [ ] Al enviar: muestra el link del portal

### Tarea 3.5 — Panel lateral: pestaña General

- [ ] Datos del cliente (nombre, correo, teléfono)
- [ ] Paquete, locación, espacio, fecha, hora
- [ ] Link del portal con botón copiar y botón WhatsApp
- [ ] Botón WhatsApp con mensaje contextual según estatus
- [ ] Botón "Sesión completada" (visible en Firmado / Anticipo recibido)
- [ ] Notas internas (campo de texto, solo admin, nunca expuesto al portal)
- [ ] Sección de pagos: total, anticipo, historial de abonos, formulario registrar abono
- [ ] Zona de riesgo: botón Archivar (suave) y botón Eliminar (requiere escribir nombre del cliente)

### Tarea 3.6 — Panel lateral: pestaña Producción

- [ ] Casilla "Fotografía lista" con sello de fecha al marcar
- [ ] Casilla "Video listo" con sello de fecha al marcar
- [ ] Botón "Guardar producción"
- [ ] Estado del contrato (solo lectura): enviado / firmado / anticipo / liquidado

### Tarea 3.7 — Panel lateral: pestaña Entrega

- [ ] Campo link Drive principal (carpeta del proyecto)
- [ ] Campo links adicionales (formato `Etiqueta|URL` o solo URL, uno por línea)
- [ ] Botón "Enviar al cliente" → llama `guardarEntrega`
- [ ] Link del portal con copiar y WhatsApp
- [ ] Botón "Revocar acceso" / "Reactivar acceso"

### Tarea 3.8 — Tab Sesiones

- [ ] Lista de eventos próximos agrupados por día (fecha, hora, cliente, paquete, locación/espacio, estatus)
- [ ] Al hacer clic en una fila: abre el panel lateral del contrato correspondiente
- [ ] Incluir en navegación desktop (tabs) y mobile (bottom nav)

### Tarea 3.9 — Tab Métricas

- [ ] Selector de período: mes / trimestre / año / todo
- [ ] Tarjetas: facturado, cobrado, por cobrar, ticket promedio
- [ ] Barras por estatus
- [ ] Top 5 clientes
- [ ] Gráfica de barras de los últimos 6 meses

### Tarea 3.10 — Tab Paquetes

- [ ] Tabla de paquetes (activos e inactivos) con columnas: clave, locación, nombre, precio, activo
- [ ] Botón activar/desactivar por paquete
- [ ] Formulario para crear/editar paquete
- [ ] `overflow-x: auto` en la tabla para mobile

### Tarea 3.11 — CRM

- [ ] Clientes únicos con historial de eventos

### Tarea 3.12 — Subir admin.html a GitHub y verificar

- [ ] Crear repositorio `proposalincmx-dev/websiteproposal` en GitHub (o el nombre que Bruno elija)
- [ ] Subir con `gh api`:
```bash
CONTENT=$(base64 -i "RUTA/admin.html" | tr -d '\n')
gh api repos/proposalincmx-dev/websiteproposal/contents/admin.html \
  --method PUT \
  --field message="feat: admin inicial" \
  --field content="$CONTENT"
```
- [ ] Conectar repositorio a Cloudflare Pages desde el dashboard de Cloudflare
- [ ] Verificar que el admin carga y que el login funciona

---

## Fase 4 — portal.html

**Objetivo:** Portal del cliente. Un solo link por evento, para todo el ciclo de vida: firma, pago, entrega.

**Archivos:**
- Crear: `portal.html` → subir a GitHub → despliega en Cloudflare Pages

**Referencia:** Leer `portal.html` de Inmuebles completo antes de escribir. Adaptar eliminando add-ons, múltiples propiedades y Clip.

### Tarea 4.1 — Estructura base

- [ ] `<!DOCTYPE html>` con Montserrat
- [ ] Mismas variables CSS que admin.html
- [ ] `init()` al cargar: lee `?token=` de la URL, llama `obtenerPortal`, decide qué etapa mostrar
- [ ] `history.replaceState` para limpiar el token de la URL después de validarlo
- [ ] Indicador de 4 pasos: Firma / Pago / Sesión / Entrega
- [ ] Manejo de token inválido o expirado: mensaje claro con botón de WhatsApp

### Tarea 4.2 — Etapa 1: Firma

- [ ] Logo de Proposal Inc
- [ ] Resumen del servicio: nombre del paquete, locación, espacio, fecha, hora
- [ ] Lista de entregables del paquete base (extraídos del campo `Entregables` del paquete)
- [ ] Sección de add-ons: muestra solo los add-ons que Bruno eligió al crear el contrato (`AdicionalesJSON`). Cada uno tiene toggle, nombre y precio. El precio total se actualiza en tiempo real al seleccionar/deseleccionar. Si Bruno no marcó ninguno, no se muestra la sección.
- [ ] Desglose de precios: precio base, add-ons seleccionados, total, anticipo (con porcentaje real calculado sobre el total), saldo
- [ ] Si `notasContrato` tiene valor: mostrar como bloque informativo
- [ ] Términos y condiciones (las 15 cláusulas del contrato, en acordeón cerrado por defecto)
- [ ] Canvas de firma digital (SignaturePad, escala a DPR del dispositivo)
- [ ] Botón "Firmar contrato" deshabilitado hasta que haya trazo real
- [ ] Barra de progreso 0→70→90% durante envío
- [ ] Protección contra doble envío
- [ ] Al confirmar: muestra pantalla de espera con mensaje "Tu contrato llegará a tu correo en unos minutos"

### Tarea 4.3 — Etapa 2: Firmado, sin pago

- [ ] Banner de estado
- [ ] Botón "Descargar contrato (PDF)" si `pdfContratoUrl` tiene valor
- [ ] Total, anticipo (con porcentaje real), saldo pendiente
- [ ] Instrucciones de pago:
  - Transferencia SPEI: CLABE, banco, titular, monto exacto, concepto (folio del contrato)
  - Depósito OXXO/7-Eleven
  - Sin link de Clip (no disponible)
- [ ] Acordeón con instrucciones paso a paso para cada método

### Tarea 4.4 — Etapa 3: Con abono, saldo pendiente

- [ ] Comprobante: encabezado oscuro con logo, tabla de servicio, totales alineados a la derecha
- [ ] Historial de abonos (fecha, monto, método)
- [ ] Botón de descarga del comprobante (window.print con @media print)
- [ ] Si hay saldo: instrucciones para pagar el restante (mismos métodos que etapa 2)

### Tarea 4.5 — Etapa 4: Entregado / Liquidado

- [ ] Banner celebratorio
- [ ] Comprobante final en acordeón (cerrado por defecto)
- [ ] Links de descarga: Drive principal + links extra (formato `Etiqueta|URL`)
- [ ] Si `entregaRevocada` tiene valor: ocultar links y banner, mostrar mensaje neutro con botón de WhatsApp (comprobante sigue visible)
- [ ] Si hay saldo pendiente: banner de advertencia + instrucciones de pago
- [ ] Botón soporte WhatsApp con mensaje pre-llenado

### Tarea 4.6 — Subir portal.html a GitHub y verificar flujo completo

- [ ] Subir con `gh api` igual que admin.html
- [ ] Crear contrato de prueba desde admin
- [ ] Abrir link del portal y completar el flujo completo:
  1. Firma el contrato
  2. Esperar que llegue el correo con el PDF (~1 minuto)
  3. Desde admin: registrar anticipo
  4. Verificar que el portal muestra etapa 3
  5. Desde admin: marcar foto y video listos, guardar entrega con link de Drive
  6. Verificar que el portal muestra etapa 4 con el link

---

## Fallos conocidos a prevenir (lecciones de Inmuebles v3.0)

Estos bugs aparecieron en el desarrollo de Inmuebles y deben prevenirse desde el diseño:

1. **`esSi` con tilde:** `'Sí'.toUpperCase()` produce `'SÍ'`, no `'SI'`. El helper `esSi1` debe contemplar los tres casos.
2. **`parseFloat(0)` como falsy:** Un anticipo de $0 se trata como "no definido". Usar `val !== undefined && val !== '' ? parseFloat(val) || 0 : fallback`.
3. **Desfase UTC en fechas:** Strings `"YYYY-MM-DD"` sin hora se interpretan como medianoche UTC (día anterior en Monterrey). Siempre agregar `T12:00:00` al parsear.
4. **`guardarPropiedades` no atómico:** En el equivalente aquí (actualizar datos del contrato), construir el nuevo estado completo antes de borrar el anterior.
5. **Doble envío del cliente:** LockService en `manejarFirmaCliente1` y `registrarAbono1`.
6. **`adminKey` en GET:** Los endpoints GET de admin deben verificar la misma `adminKey` que los POST. Usar `ACCIONES_ADMIN_GET1`.
7. **Inyección de fórmulas en Sheets:** `sanitizarParaSheets` en todo valor que venga del cliente.
8. **Precio sobreescrito al firmar:** Usar `contrato.Precio` (precio acordado), no el precio del catálogo.
9. **Anticipo sobreescrito al firmar:** Preservar el anticipo original si el cliente no modificó el total.
10. **XSS en botones de paquetes:** Usar `data-clave` en lugar de `JSON.stringify` en atributos `onclick`.

---

## Orden de ejecución

```
Fase 1 (setup.js) → Bruno ejecuta → anota IDs
Fase 2 (ScriptContratos1_v1.js) → desplegar → configurar triggers
Fase 3 (admin.html) → subir a GitHub → Bruno prueba creando contrato de prueba
Fase 4 (portal.html) → subir a GitHub → Bruno prueba flujo completo
```

Los cuatro archivos de código se escriben primero, en una sola tanda. La puesta en marcha y las pruebas se hacen después, en el orden de arriba: cada fase necesita los IDs o la URL que produce la anterior, así que la secuencia de despliegue no es opcional.

### Puesta en marcha (paso a paso)

Los archivos de código ya están escritos. Esta es la secuencia para ponerlos en producción.

1. **Ejecutar `setup.js`.** En Apps Script, con la cuenta `proposalincmx@gmail.com`, pegar `setup.js` y ejecutar `instalar()`. Anotar los 3 IDs del registro: carpeta del sistema, hoja de cálculo y template del contrato.
2. **Configurar y desplegar el backend.** En `ScriptContratos1_v1.js`, en `CONFIG1`, pegar los 3 IDs en `CARPETA_SISTEMA_ID`, `SHEET_ID` y `TEMPLATE_CONTRATO_ID`. Desplegar como aplicación web con acceso para cualquier usuario. Anotar la URL del backend.
3. **Conectar los HTML al backend.** Pegar la URL del backend en la constante `API` de `admin.html` y de `portal.html`.
4. **Publicar los HTML.** Subir `admin.html` y `portal.html` al repositorio de GitHub y conectarlo a Cloudflare Pages. Anotar la URL pública del portal.
5. **Cerrar el círculo backend-portal.** Pegar la URL del portal en `CONFIG1.BASE_URL_PORTAL` del backend y volver a desplegar como versión nueva.
6. **Activar los procesos automáticos.** En Apps Script, ejecutar `instalarTriggers1()` una sola vez.
7. **Probar el flujo completo.** Crear un contrato de prueba desde el admin, abrir el portal, firmar, registrar un abono, marcar producción y entrega.

**Marcadores por reemplazar durante el despliegue:**
- `ScriptContratos1_v1.js`: `SHEET_ID`, `CARPETA_SISTEMA_ID`, `TEMPLATE_CONTRATO_ID`, `BASE_URL_PORTAL`.
- `admin.html` y `portal.html`: la constante `API`.

**Antes de salir a producción:** cambiar `CONFIG1.MODO_BORRADOR` de `true` a `false` para que los correos se envíen de verdad y no como borrador.
