# ContextoMaster v1.0 — Sistema de Contratos Proposal Inc

*Creado: 21 de mayo de 2026 · Última actualización: 28 de mayo de 2026*

---

## Estado del proyecto

Los cuatro archivos del sistema (`setup.js`, `ScriptContratos1_v1.js`, `admin.html`, `portal.html`) están escritos en `02. contratos/01. VERSION 1.0/` y pasaron ocho rondas de auditoría entre el 22 de mayo de 2026 y el 25 de mayo de 2026. Todos los bugs críticos e importantes fueron corregidos. El sistema está listo para la puesta en marcha: ejecutar `setup.js`, desplegar el backend, publicar los HTML y probar el flujo completo con un contrato real antes de usarlo con clientes. Ver la sección "Orden de ejecución" del plan de construcción para la secuencia paso a paso.

**Mejoras aplicadas el 28 de mayo de 2026:**

- `accionListarStats1`: ahora devuelve `tiempoEntrega`, calculado con contratos que tienen `FechaEvento` y `FechaEntrega`. El período se filtra por `FechaEvento`, no por fecha de creación ni por fecha de entrega. Métricas incluidas: `promedioDias`, `totalEntregas`, `minimoDias`, `maximoDias`.
- `calcularTiempoEntregaStats1`: nuevo helper que calcula días reales de entrega como `FechaEntrega - FechaEvento`, con mínimo de 0 días para entregas registradas el mismo día o con horarios que crucen zona horaria.
- `admin.html` — Análisis > Métricas: nueva tarjeta "Tiempo de entrega". Muestra promedio en días, entregas medidas, entrega más rápida y entrega más lenta.
- `admin.html` — tabla de contratos: nueva selección masiva con checkboxes. Incluye "Seleccionar visibles", "Limpiar", "Archivar" y "Eliminar".
- `accionOcultarContratosMasivo1`: nuevo endpoint admin para archivar varios contratos seleccionados. Usa el mismo borrado suave del flujo individual (`Oculto = true`) y protege la operación con `LockService`.
- `accionEliminarContratosMasivo1`: nuevo endpoint admin para eliminar permanentemente varios contratos seleccionados. Reutiliza el borrado individual en cascada: elimina filas en `Contratos1`, `Abonos1` y `Tokens1`. No borra archivos de Drive ni eventos de Calendar, igual que el borrado individual actual.
- `admin.html` — borrado masivo permanente: requiere confirmación normal y luego escribir `BORRAR` para reducir el riesgo de eliminación accidental.
- GitHub: `admin.html` y `ScriptContratos1_v1.js` fueron subidos al repo `inmueblesaudiovisuales-dev/proposal_inc` el 28 de mayo de 2026. Para producción, el backend aún debe actualizarse/desplegarse en Apps Script si no se ha pegado la nueva versión ahí.

**Mejoras aplicadas el 27 de mayo de 2026:**

- `crearEventoCalendario1`: la descripción del evento de Calendar ahora incluye nombre completo del cliente, nombre de la pareja, música, familia, alergias, notas internas y link a la carpeta de Drive. Antes solo tenía paquete, teléfono y correo.
- `accionConfirmarReservacion1` y `accionManejarFirmaCliente1` (anticipo=0): bug — `CarpetaProyectoID` se actualizaba en Sheets pero el objeto en memoria no se sincronizaba, por lo que `crearEventoCalendario1` siempre recibía ese campo vacío. Corregido actualizando el objeto en memoria antes de llamar a la función de Calendar.
- `buildDescripcionEvento1`: nuevo helper que centraliza la construcción de la descripción del evento. Usado tanto al crear como al actualizar el evento, eliminando duplicación de lógica.
- `actualizarDescripcionEventoCalendario1`: nueva función que actualiza la descripción de un evento de Calendar existente sin modificar fecha, hora ni título.
- `accionGuardarNotasInternas1`: ahora sincroniza automáticamente la descripción del evento de Calendar cada vez que Bruno guarda notas internas.
- `accionEnviarRecordatorioPago1`: nuevo endpoint (requiere clave admin). Envía al cliente un correo con el saldo pendiente, CLABE, número de tarjeta para OXXO/7-Eleven y link de WhatsApp. Solo se ejecuta si `SaldoPendiente > 0` y el cliente tiene correo registrado.
- `correoRecordatorioPago1`: nueva función de plantilla HTML para el correo de recordatorio de pago.
- `CONFIG1.TARJETA`: número de tarjeta Banamex centralizado en CONFIG1 (`'5544 9206 0686 5310'`). Antes estaba hardcodeado solo en `portal.html`.
- `admin.html` — formularios de creación: nuevo campo "¿Por dónde te contactó?" con opciones WhatsApp / Instagram. Alimenta la columna `OrigenCliente` en Contratos1, que el reporte de canal ya leía pero nunca se capturaba.
- `admin.html` — sidepanel General: nuevo botón "Enviar recordatorio de pago", visible solo cuando `SaldoPendiente > 0`. Llama al endpoint `enviarRecordatorioPago`.

**Fixes aplicados el 25 de mayo de 2026 (rondas 7 y 8 de auditoría — lectura completa de las 2,913 líneas del script):**

- `accionDisponibilidadGuardar1` (Safi): el nombre de la hoja de log estaba escrito como `'DisponibilidadLog'`; corregido a `'DisponibilidadSafi Log'` (con espacio, igual que la hoja real).
- `accionGuardarEntrega1`: la lista de estatus válidos para entregar no incluía `'Entregado'`, impidiendo re-entregas. Corregido.
- `accionRegistrarAbono1`: variable `esPrimerAbono` declarada y calculada pero nunca leída. Eliminada.
- `accionManejarFirmaCliente1`: al aceptar add-ons, el anticipo se recalculaba al 50% plano en lugar de mantener el porcentaje original. Corregido con ratio proporcional.
- `accionDisponibilidadGuardarRincon1` y `accionDisponibilidadGuardar1`: `hoja.deleteRow(NaN)` podía lanzarse si no se encontraba la fila. Agregado guard que retorna si `filaIdx === undefined`.
- `accionObtenerPortal1`: `addonsDisponibles` se construía desde `AdicionalesJSON` (los que el cliente ya aceptó) en lugar de desde `AddonsOfrecidosJSON` (los que Bruno ofreció). Corregido.
- `accionObtenerPanelFinanciero1`: búsqueda del índice de la columna de fecha en `Abonos1` solo buscaba `'FechaRegistro'`; si la hoja tiene `'Fecha'` como nombre alternativo, fallaba. Agregado fallback.
- `accionReagendarContrato1`: parsing de `nuevaHora` sin validación de formato, permitiendo valores como `'undefined:NaN'`. Reemplazado por regex `/^(\d{1,2}):(\d{2})$/`.
- `accionRegistrarAbono1`: `correoReciboAbono1` estaba definida pero nunca se invocaba. Se llama ahora al registrar cada abono, con guard de correo válido.
- `instalarTriggers1`: `limpiarTokensViejos1` no tenía trigger instalado. Agregado trigger semanal. Total de triggers: 4.

**Fixes aplicados el 24 de mayo de 2026 (post-auditoría):**

- `accionActualizarEstatus1`: agrega validación de orden de estatus. Si el nuevo estatus está antes del actual en el ciclo `['Pendiente firma','Firmado','Anticipo recibido','Reservado','Liquidado','En produccion','Entregado']`, rechaza con error. Previene retrocesos accidentales.
- `accionReagendarContrato1`: valida estatus en el backend antes de reagendar. Solo permite contratos en `['Firmado','Anticipo recibido','Reservado','Liquidado']`. Rechaza `Pendiente firma` y `Entregado`.
- `accionManejarFirmaCliente1`: cuando `anticipoFinal === 0` (el contrato pasa directo a `En produccion` al firmar), ahora crea la carpeta en Drive y el evento en Calendar igual que haría `accionConfirmarReservacion1`. Sin este fix el contrato quedaba sin carpeta ni evento.
- `accionActualizarMeta1` y `accionObtenerPanelFinanciero1`: agrega null-check de la hoja `Configuracion1` antes de llamar `.getRange()`. Si la hoja no existe todavía, devuelve error descriptivo en lugar de lanzar excepción.

---

## El negocio

Proposal Inc, fundado por Bruno Gutierrez Salazar, Monterrey, NL. Negocio de pedidas de mano y propuestas de noviazgo: coordinación completa del evento (locación, decoración, cena, música) más producción audiovisual (fotografía y video cinematográfico).

Lleva 5 años en operación y ya tiene clientes activos.

**Equipo:**
- Bruno — video
- Fernanda — fotografía
- Danna — asistente y edición de video

**Contacto:**
- Email: proposalincmx@gmail.com
- WhatsApp: https://wa.me/5218115080778
- Instagram: https://www.instagram.com/proposal.inc/
- TikTok: https://www.tiktok.com/@proposalinc
- Facebook: https://www.facebook.com/Proposalinc/

**Identidad visual:** logo vertical de Proposal Inc, en la carpeta `12. logos/` (`proposalinclogovertical.svg` y `proposalinclogovertical-2.png`). Ya está integrado en el admin, el portal y el contrato; en los correos automáticos sigue como texto hasta que el logo tenga una URL pública. Paleta del sistema: onyx `#1C1C1E` y dorado `#C9A84C`. Tipografía: Montserrat.

---

## El sistema

Backend en Google Apps Script. Base de datos en Google Sheets. Almacenamiento en Google Drive. Correos por Gmail. HTMLs alojados en GitHub + Cloudflare Pages.

Dominio propio: `proposal-inc.com`, registrado en Cloudflare. La landing page de marketing vive en `proposal-inc.com`. El sistema de contratos (`admin.html`, `portal.html`) está publicado en `contratos.proposal-inc.com` — proyecto de Cloudflare Pages `proposal-inc` (`proposal-inc.pages.dev`).

Este sistema reemplaza el flujo Google Forms → Apps Script → Google Docs → Adobe Sign.

---

## Infraestructura

### Datos de contacto y pago

- **Email:** proposalincmx@gmail.com
- **WhatsApp:** https://wa.me/5218115080778
- **Banamex CLABE:** 002580905411451243
- **Cuenta:** 1145124
- **Tarjeta Banamex (depósito en OXXO/7-Eleven):** 5544 9206 0686 5310
- **Titular:** Bruno Gutierrez Salazar
- **Pago con tarjeta:** no disponible (solo transferencia y depósito en OXXO/7-Eleven con número de tarjeta)

### Dominio y repositorio

- **Dominio:** `proposal-inc.com`, registrado en Cloudflare.
- **Repositorio:** la landing page usa `inmueblesaudiovisuales-dev/proposal-inc-website`. El sistema de contratos usa `inmueblesaudiovisuales-dev/proposal_inc`. Ambos son privados. Los HTML se suben con `gh api --method PUT`.
- **Hosting:** Cloudflare Pages. Landing page: `proposal-inc.com`. Sistema de contratos: `contratos.proposal-inc.com` (proyecto `proposal-inc`).

### IDs a generar con setup.js

*(Se llenarán después de ejecutar setup.js)*

- **Carpeta sistema Drive:** 1sRTL4YdAfNYar1Jf5TEVVc-_O60pIdmj
- **Sheets v1:** 1VsQhekX8UXZSe7e1OLGpDRLEVbGaCz9gu1IuM7__s5g
- **Template Contrato v1:** 1fjNS7Tm6TW1W5lBSiodPGJcfhoX80eepmUkThQV9Ank
- **Apps Script URL v1:** https://script.google.com/macros/s/AKfycbzBGRjR4O59P-gP3F53TFWO65TcWO9bsfbu91dhvRwPLWv1e2FcM7nun6KkuDYDVG8MTw/exec

---

## Workflow del negocio

1. El cliente contacta por WhatsApp.
2. Se le muestran paquetes. Elige paquete y fecha tentativa.
3. Bruno verifica disponibilidad con la locación (Safi o Rincón de Santiago).
4. Confirmada la disponibilidad, se le piden los datos: nombre completo, correo electrónico y hora del evento. (Muchas veces Bruno sugiere la hora según disponibilidad.)
5. Se envía el contrato por link del portal. El cliente completa el cuestionario y firma digitalmente.
6. Se solicita el 50% de anticipo al firmar.
7. Bruno registra el abono en el admin. El sistema guarda el abono, actualiza el saldo y envía un recibo simple de pago al cliente. El estatus pasa a `Anticipo recibido`.
8. Bruno confirma la reservación con la locación usando el botón "Confirmar reservación con hotel" en el sidepanel. El sistema asigna el espacio específico, crea la carpeta del proyecto en Drive, crea el evento en Google Calendar y envía el correo de confirmación al cliente. El estatus pasa a `Reservado`.
9. Bruno reserva las letras con el proveedor externo (si aplica).
10. El 50% restante se paga 3 días hábiles antes del evento.
11. El día anterior o el mismo día: Bruno coordina con el proveedor de pétalos.
12. Se realiza el evento: pedida de mano, sesión de foto y video (~20 minutos), cena en terraza.
13. Entrega del material: Express al día siguiente (paquetes Premium) o estándar en 2 semanas.

---

## Locaciones

### Safi Metropolitan

**Dirección:** Av. Lázaro Cárdenas 2400, Valle Oriente, 66260 San Pedro Garza García, N.L.

**Espacios:**
- Terraza Principal
- Terraza Condominios

**Capacidad de eventos por día:** hasta 4 eventos reutilizando ambas terrazas. Cada cliente ocupa la terraza 3 horas o menos (con excepciones). Ejemplo de acomodo:
- 5:00 pm — Terraza Principal
- 6:00 pm — Terraza Condominios
- 8:00 pm — Terraza Principal
- 9:00 pm — Terraza Condominios

El restaurante cierra a las 11:00 pm. Se recomienda que el último evento no inicie después de las 9:00 pm, pero es posible con advertencia al cliente.

**Restricciones:**
- No se permite el uso de chisperos (las imágenes del catálogo son ilustrativas de eventos anteriores).
- Los domingos no se sirve alcohol por restricción del establecimiento; se reemplaza con bebidas no alcohólicas.

**Menú (lunes a sábado):**
- 1er tiempo: Ensalada tres corazones con alioli de limón.
- 2do tiempo: Pechuga de pollo rellena a la florentina envuelta con tocino en salsa de chipotle con frambuesa, acompañada de puré de camote con papa y verduras baby.
- 3er tiempo: Brownie con helado de vainilla.
- Incluye: botella de vino + dos welcome drinks.

**Menú (domingos):**
- Mismos platillos, sin alcohol. Se reemplaza el vino y los welcome drinks por bebidas no alcohólicas.

---

---

## Cuestionario del cliente

El portal solicita cinco datos al cliente en la Etapa 1 (antes de firmar). Se guardan en el Sheets y son visibles solo para el equipo desde el sidepanel del admin. No aparecen en el PDF del contrato ni en los correos automáticos al cliente.

| Campo | Columna | Obligatorio |
|-------|---------|-------------|
| Nombre de la pareja | `NombrePareja` | Sí |
| Canción del evento | `CancionEvento` | No |
| ¿Asiste familia/amigos? | `FamiliaAsiste` | No (si/no) |
| Número de personas | `FamiliaNumero` | No (solo si FamiliaAsiste = Sí) |
| Alergias alimentarias | `AlergiasAlimentarias` | No |

---

### Rincón de Santiago (Gamma)

**Dirección:** Bahía Escondida, Ébano, 67300 Santiago, N.L.

**Espacios:**
- Isla
- Terraza
- Área de yoga
- Auditorio

**Restricción crítica:** La Isla nunca está disponible los sábados — el hotel la reserva para sus propias actividades ese día. El backend valida esta restricción al crear el contrato y devuelve error si se intenta reservar Isla un sábado.

**Menú:** Tienen varias opciones de cena (pendiente de documentar).

---

## Cotizaciones personalizadas

Además de las locaciones propias, Proposal Inc realiza eventos en locaciones elegidas por el cliente (residencias, restaurantes, rooftops privados, etc.). En estos casos:

- El contrato es de tipo `personalizado` en lugar de `estandar`.
- No hay selector de locación del catálogo — Bruno escribe la dirección manualmente.
- No hay selector de espacio — campo de texto libre.
- La descripción del servicio es texto libre (Bruno describe qué se incluye).
- El precio es totalmente manual.
- El admin muestra un formulario simplificado al elegir tipo "Personalizado": dirección, descripción, precio, anticipo.
- En el portal, el cliente ve el resumen con los datos que Bruno ingresó, sin mencionar espacios o locaciones del catálogo.

**`TipoContrato`** — nueva columna en Contratos1: `estandar` o `personalizado`.

---

## Paquetes del catálogo (v2, vigente desde el 23 de mayo de 2026)

Los paquetes viven en la hoja `Paquetes1` del Sheets y se cargan dinámicamente. Para agregar, editar o desactivar un paquete: editar la hoja, sin tocar código.

El catálogo v2 (modelo base + add-ons a la carta + combos) reemplazó el modelo de tres niveles (Esencial/Plus/Premium) en la sesión del 23 de mayo de 2026. El script de migración es `actualizarPaquetes_v2.js` — debe ejecutarse una sola vez en Apps Script.

### Paquetes base

| # | Clave | Nombre | Precio | Locación |
|---|-------|--------|--------|----------|
| 1 | `SAFI-MINIMALISTA` | Safi Minimalista | $7,000 MXN | Safi Metropolitan |
| 2 | `SAFI-CORAZON` | Safi Corazón | $8,000 MXN | Safi Metropolitan |
| 3 | `SAFI-LETRAS` | Safi Letras "MARRY ME" | $10,000 MXN | Safi Metropolitan |
| 4 | `RINCON-MINIMALISTA` | Rincón Minimalista | $11,000 MXN | Rincón de Santiago |
| 5 | `RINCON-LETRAS` | Rincón Letras "MARRY ME" | $14,000 MXN | Rincón de Santiago |
| 6 | `NOV-CENA` | Cena Romántica | $5,500 MXN | Safi Metropolitan |
| 7 | `NOV-CORAZON` | Corazón Noviazgo | $7,000 MXN | Safi Metropolitan |
| 8 | `NOV-LETRAS` | Letras Noviazgo | $12,000 MXN | Safi Metropolitan |

### Add-ons individuales

`EsAdicional = Si` en Paquetes1. El portal muestra el precio en tiempo real al seleccionarlos.

| Clave | Nombre | Precio | CostoVariable |
|-------|--------|--------|---------------|
| `ADD-EXPRESS` | Entrega Express (24 horas) | $2,000 MXN | $0 |
| `ADD-RECUERDOS` | Camino de recuerdos (30 fotos impresas) | $1,500 MXN | $550 |
| `ADD-DRONE` | Video aéreo con drone | $1,500 MXN | $0 |
| `ADD-PETALOS` | Pétalos adicionales y velas | $1,500 MXN | $500 |
| `ADD-TEASER` | Video teaser vertical (9:16) | $1,000 MXN | $0 |
| `ADD-SAXOFON` | Saxofonista en vivo | $4,500 MXN | $3,000–$3,500 (variable por locación) |
| `ADD-FOTO` | Fotografía profesional | $1,000 MXN | $150 |
| `ADD-VIDEO` | Video cinematográfico | $1,500 MXN | $150 |

### Combos

`EsAdicional = Si`, `ComponentesCombo` contiene las claves de los add-ons que agrupan (separadas por coma). El portal detecta automáticamente cuándo la selección individual equivale a un combo y aplica el precio del combo.

| Clave | Nombre | ComponentesCombo | Precio |
|-------|--------|-----------------|--------|
| `COMBO-AUDIOVISUAL` | Audiovisual Noviazgo | ADD-FOTO,ADD-VIDEO | $2,200 MXN |
| `COMBO-CINEMATOGRAFICO` | Cinematográfico | ADD-TEASER,ADD-DRONE,ADD-PETALOS | $3,200 MXN |
| `COMBO-VIP` | VIP | ADD-RECUERDOS,ADD-EXPRESS | $3,000 MXN |
| `COMBO-TOTAL` | Experiencia Total | ADD-TEASER,ADD-DRONE,ADD-PETALOS,ADD-RECUERDOS,ADD-EXPRESS | $5,500 MXN |

---

## Equipo de producción

| Equipo | Uso principal |
|--------|--------------|
| DJI Air 3 | Drone principal |
| DJI Mini 4 Pro | Drone secundario |
| Sony FX30 + Gimbal RS4 | Video cinematográfico |
| Sigma 16mm (E-mount) | Video (lente principal) |
| Sigma 18-35mm Canon + convertidor E-mount | Fotografía |
| Sony A7III | Fotografía principal |
| Sony A6400 | Fotografía secundaria |
| Sigma 30mm | Fotografía |
| Osmo Pocket 3 | Respaldo en lluvia o falla de equipo |

---

## Entregables al cliente

### Carpeta de Drive

Cuando Bruno confirma la reservación con el hotel (endpoint `confirmarReservacion`), el sistema crea automáticamente en Drive:

```
01. Proyectos/
  [Año]/
    [MM. Mes]/
      PI-YYMM.DD-APELLIDO — NombreCliente/
        Fotos/
        Video/
```

La jerarquía de años (2026-2031) y meses se pre-crea en el `setup.js` para que exista desde el primer día. La carpeta del cliente específico se crea al confirmar la reservación. En contratos con anticipo = 0, donde el flujo pasa directamente a `En produccion` al firmar, la carpeta se crea en ese momento (al firmar) porque no hay paso de confirmación de reservación. El ID de esa carpeta se guarda en `CarpetaProyectoID` y se pre-llena en la pestaña Entrega del admin cuando Bruno va a entregar el material.

### Contenido de la entrega

- **Fotos:** galería completa editada en alta resolución, dentro de la subcarpeta `Fotos`.
- **Video:** video cinematográfico único (incluye clip de drone si el paquete lo tiene), dentro de `Video`.
- **Video teaser vertical (9:16):** si el paquete o add-on lo incluye, se agrega como archivo separado en `Video`.

**Sin RecorridoVirtual:** este sistema no maneja recorridos virtuales. No hay columna `RecorridoURL` ni `RecorridoListo`.

**Camino de recuerdos:** 30 fotos impresas en FOTOVIDA (~$250 MXN), colgadas en 3 filas hacia las letras o la estructura. Es un add-on o viene incluido en Premium. Costo operativo interno.

---

## Folio

Formato: `PI-YYMM.DD`

Si hay múltiples eventos el mismo día, se agrega el primer apellido del cliente como sufijo: `PI-YYMM.DD-GARCIA`, `PI-YYMM.DD-LOPEZ`, etc. Esto hace el folio legible y evita la confusión de reindexar números cuando llega un evento anterior al que ya tenía folio sin sufijo.

---

## Google Sheets — estructura de hojas

### Contratos1

Token, Folio, TipoContrato, NombreCliente, CorreoCliente, TelefonoCliente, PaqueteClave, PaqueteNombre, AdicionalesJSON, AddonsOfrecidosJSON, Locacion, EspacioLocacion, DescripcionServicio, Precio, Anticipo, SaldoPendiente, Estatus, FechaCreacion, FechaEvento, HoraEvento, FechaFirma, FechaUltimoAbono, FechaEntrega, FirmaBase64URL, PdfContratoUrl, EntregaDriveLink, EntregaLinksExtra, CarpetaProyectoID, NotasContrato, NotasInternas, SesionCompletada, RecordatorioEnviado, FotografiaLista, VideoListo, EntregaRevocada, Oculto, NombrePareja, CancionEvento, FamiliaAsiste, FamiliaNumero, AlergiasAlimentarias, GastosVariablesExtra

- **GastosVariablesExtra** — costos del evento que no están cubiertos por `CostoVariable` del paquete. Bruno los ingresa manualmente desde el sidepanel del admin. Ejemplos: saxofonista en Rincón ($3,500), costos de locaciones personalizadas. El panel financiero los suma al costo variable del contrato para calcular el margen real.

- **TipoContrato** — `estandar` (paquete del catálogo en Safi o Rincón) o `personalizado` (locación libre, precio y descripción manuales).

- **DescripcionServicio** — descripción del servicio contratado. En contratos `estandar` es una copia de los entregables del paquete al momento de crear el contrato. En `personalizado` es el texto libre que captura Bruno. Alimenta el placeholder `{{descripcion}}` del contrato.

- **AdicionalesJSON** — al crear el contrato, guarda las claves de add-ons que Bruno ofrece. Al firmar, se reemplaza con solo los add-ons que el cliente aceptó.
- **AddonsOfrecidosJSON** — guarda las claves de add-ons que Bruno ofreció al crear el contrato. Nunca se modifica después. Permite saber qué se ofreció aunque el cliente rechace algunos.
- **CarpetaProyectoID** — ID de Drive de la carpeta del proyecto, creada al confirmar la reservación (endpoint `confirmarReservacion`). Se guarda para evitar duplicados.
- **ReservacionConfirmada** — timestamp ISO de cuándo Bruno confirmó la reservación con la locación. Si tiene valor, el botón de confirmar se oculta y se muestra el espacio asignado.

**Columnas del cuestionario del cliente (se llenan al firmar):** NombrePareja, CancionEvento, FamiliaAsiste (Sí/No), FamiliaNumero (entero), AlergiasAlimentarias. Son internas: visibles en el sidepanel del admin, no en el portal del cliente ni en el PDF.

- **OrigenCliente** — canal por donde el cliente contactó a Proposal Inc. Se captura al crear el contrato en el admin. Opciones: `WhatsApp`, `Instagram` o vacío (no especificado). Alimenta el reporte de canal de marketing.

**Flujo de confirmación de espacio para Safi:** al crear el contrato, el espacio puede quedar en blanco porque Safi confirma la reservación después de que el cliente paga el anticipo. Cuando Bruno confirma con la locación, usa el botón "Confirmar reservación con hotel" en el sidepanel del admin, que abre un modal para seleccionar el espacio. El endpoint `confirmarReservacion` guarda el espacio en `EspacioLocacion`, registra la fecha en `ReservacionConfirmada`, cambia el estatus a `Reservado`, crea la carpeta del proyecto en Drive, crea el evento en Google Calendar y envía el correo de confirmación al cliente.

### Tokens1

Token, ContratoID, Tipo, Expira, Usado

### Abonos1

ID, ContratoToken, Monto, Metodo, Fecha, FechaRegistro, Notas

### Paquetes1

Clave, Locacion, Nombre, Precio, EsAdicional, Entregables, Activo, Orden, ComponentesCombo, CostoVariable

- **ComponentesCombo** — claves de los add-ons que integra el combo, separadas por coma (ej: `ADD-FOTO,ADD-VIDEO`). Vacío para paquetes base y add-ons individuales. Agregada el 23 de mayo de 2026 por `actualizarPaquetes_v2.js`.
- **CostoVariable** — costo operativo interno por contrato. Usado por el panel financiero para calcular el margen de cada evento. Pendiente de agregar a Paquetes1 (no incluido en la migración inicial).

### Configuracion1

Hoja nueva para costos ajustables mes a mes. Estructura: Mes (YYYY-MM), PresupuestoAnuncios.

- Permite a Bruno ajustar el gasto mensual en anuncios desde el admin sin tocar código.
- El panel financiero lee la fila del mes en curso para calcular los costos fijos reales del mes.

---

## Estatus del ciclo de vida

`Pendiente firma` → `Firmado` → `Anticipo recibido` → `Reservado` → `Liquidado` → `En produccion` → `Entregado`

- **Reservado** — Bruno confirma la reservación con la locación desde el admin. El sistema asigna el espacio específico, crea la carpeta del proyecto en Drive, crea el evento en Google Calendar y envía el correo de confirmación al cliente.
- **Liquidado** — el saldo queda en cero (50% restante recibido, normalmente 3 días hábiles antes del evento).
- **En produccion** — el evento se realizó; el equipo está editando foto y video.
- **Entregado** — el material fue entregado al cliente con link de Drive.

Flujo con anticipo=0 (si aplica): `Pendiente firma` → `En produccion`

---

## Contrato — campos del template

Los placeholders del Google Doc template:

| Placeholder | Dato |
|-------------|------|
| `{{fechaContrato}}` | Fecha de creación del contrato |
| `{{nombre1}}` | Nombre completo del cliente |
| `{{telefono}}` | Teléfono del cliente |
| `{{correoCliente}}` | Correo electrónico del cliente |
| `{{fechaEvento}}` | Fecha del evento |
| `{{horario}}` | Hora del evento |
| `{{locacion}}` | Nombre corto de la locación |
| `{{locacion2}}` | Dirección completa de la locación |
| `{{espacio}}` | Espacio específico (ej: Terraza Principal, Isla) |
| `{{descripcion}}` | Descripción del paquete contratado |
| `{{precio}}` | Precio total |
| `{{anticipo}}` | Monto del anticipo (50% por defecto) |
| `{{restante}}` | Saldo restante |

El contrato tiene 15 cláusulas ya redactadas. La entrega es en 15 días hábiles (estándar) o al día siguiente (express, paquetes Premium). Tolerancia de 10 minutos para el cliente; extensión disponible a $2,000 MXN por 40 minutos adicionales.

---

## Restricciones operativas importantes

- **Isla en Rincón de Santiago:** nunca disponible los sábados.
- **Safi — domingos:** sin alcohol en el menú.
- **Safi — chisperos:** prohibidos en todas las terrazas.
- **Letras MARRY ME:** instalación a cargo de proveedor externo; Bruno debe coordinar con anticipación.
- **Corazón:** instalación a cargo del equipo de Proposal Inc.
- **Pétalos:** pedido al proveedor el día anterior o el mismo día del evento.
- **Camino de recuerdos:** impresión en FOTOVIDA (~$250 MXN por 30 fotos), costo interno.
- **Horario Safi:** restaurante cierra a las 11:00 pm. Máximo recomendado: evento a las 9:00 pm. Eventos más tardíos requieren advertencia explícita al cliente.

---

## Archivos del sistema

| Archivo | Para quién | Descripción |
|---------|-----------|-------------|
| `setup.js` | Una ejecución | Crea infraestructura: Sheets, template contrato, Paquetes1 |
| `ScriptContratos1_v1.js` | Backend | Script principal de Google Apps Script |
| `admin.html` | Bruno, Fernanda, Danna | Panel de control |
| `portal.html` | Cliente | Portal de firma, pago y entrega |

---

## admin.html — descripción

Similar al admin de Inmuebles Audiovisuales con las siguientes particularidades:

- **Crear contrato:** nombre, correo, teléfono del cliente; paquete (cargado desde Paquetes1); locación y espacio específico; fecha y hora del evento; precio (autocompletado, editable); anticipo (default 50%, editable en pesos).
- **Lista de contratos:** folio, cliente, paquete, estatus, saldo, fecha del evento. Permite seleccionar contratos con checkboxes y ejecutar acciones masivas sobre los visibles o seleccionados.
- **Panel lateral — 3 pestañas:**
  - General: datos del cliente, paquete, link del portal, WhatsApp contextual, cuestionario del cliente (solo lectura), pagos, notas internas, zona de riesgo. Cuando el estatus es `Anticipo recibido` y la reservación aún no está confirmada, aparece el botón "Confirmar reservación con hotel" que pide seleccionar el espacio específico y dispara la creación del folder, el evento de calendario y el correo al cliente.
  - Producción: checklist de foto y video con sello de fecha. Botón "Evento completado, iniciar edición" visible en estatus Firmado, Anticipo recibido, Reservado y En producción.
  - Entrega: links de Drive, botón enviar al cliente, revocar/reactivar acceso.
- **Análisis > Métricas:** facturado, cobrado, por cobrar, ticket promedio y tiempo de entrega. El tiempo de entrega se calcula desde `FechaEvento` hasta `FechaEntrega`, solo con contratos ya entregados.
- **Acciones masivas:** desde la tabla se pueden archivar o eliminar contratos seleccionados. Archivar conserva los datos con `Oculto = true`. Eliminar borra contrato, abonos y tokens, y exige escribir `BORRAR`.
- **Acceso:** los tres miembros del equipo (Bruno, Fernanda, Danna) usan el mismo admin con contraseña compartida.

---

## portal.html — etapas

**Etapa 1 — Pendiente firma**

El cliente ve el resumen de su paquete (nombre, locación neutral — nunca el nombre del establecimiento —, fecha, hora, descripción de entregables) y el desglose de precios (total, anticipo con porcentaje, saldo). Add-ons disponibles con precio en tiempo real. Términos y condiciones. Cuestionario obligatorio (ver sección "Cuestionario del cliente"). Canvas de firma digital. El botón de firma permanece deshabilitado hasta que haya trazo real en el canvas y el campo Nombre de la pareja tenga valor.

**Etapa 2 — Firmado, sin pago**

Banner de estatus. Total, anticipo, saldo. Botón de descarga del contrato PDF. Instrucciones de pago: transferencia CLABE o depósito. (Sin link de Clip — no tienen pago con tarjeta.)

**Etapa 3 — Con abono, saldo pendiente**

Comprobante de pago. Historial de abonos. Si hay saldo: instrucciones para pagar el restante.

**Etapa 4 — Liquidado / Entregado**

Links de descarga de la carpeta Drive (fotos y video). Si `EntregaRevocada` tiene valor: se ocultan los links y se muestra mensaje neutro con botón de WhatsApp.

---

## Correos automáticos

1. **PDF del contrato** — se genera de forma diferida (trigger cada minuto, protegido con LockService) y se envía al cliente con el contrato adjunto al firmar. Si el correo falla después de generar el PDF, se envía alerta a Bruno.
2. **Recibo de abono** — se envía al cliente en cada abono registrado. Muestra folio, monto pagado y saldo restante. No incluye datos de la locación.
3. **Confirmación de reservación** — se envía cuando Bruno confirma la reservación con el hotel desde el admin. Incluye fecha, hora y locación del evento.
4. **Entrega** — se envía al marcar la entrega, con el link de la carpeta Drive.
5. **Recordatorio 24 horas** — trigger horario. Se envía cuando `FechaEvento` es mañana y aún no se ha enviado el recordatorio. Muestra hora y espacio (si tiene valor).
6. **Recordatorio de pago (manual)** — Bruno lo dispara desde el botón "Enviar recordatorio de pago" en el sidepanel del admin, visible cuando hay saldo pendiente. Incluye folio, saldo, CLABE, número de tarjeta para OXXO/7-Eleven, titular y link de WhatsApp. No es automático: Bruno decide cuándo enviarlo.

---

## GitHub — cómo subir archivos al sitio

Dominio: `proposal-inc.com`, registrado en Cloudflare.

- **Landing page:** repositorio `inmueblesaudiovisuales-dev/proposal-inc-website`, proyecto Cloudflare Pages `proposal-inc-website`. Se despliega con `wrangler pages deploy`.
- **Sistema de contratos:** repositorio `inmueblesaudiovisuales-dev/proposal_inc`. Los HTML se suben con `gh api --method PUT /repos/inmueblesaudiovisuales-dev/proposal_inc/contents/{archivo}`. El script del backend (`ScriptContratos1_v1.js`) se actualiza vía Gist `895c5ae3dd3b28c6c020ecd6419027a8` para evitar corrupción de caracteres Unicode al subirlo por la API de Drive.

---

## Sistema anterior (reemplazado)

Google Forms → Google Sheets → Apps Script → Google Doc (PDF) → Adobe Sign.

**Campos del formulario antiguo:** fechaContrato, nombre1, telefono, fechaEvento, horario, locacion (nombre corto), locacion2 (dirección completa), descripcion (texto largo del paquete), precio.

**Problemas del sistema anterior:**
- Sin firma digital integrada (Adobe Sign por fuera).
- Sin seguimiento de anticipo ni saldo (el campo anticipo estaba vacío en el template).
- Sin portal para el cliente.
- Sin correos automáticos.
- Sin seguimiento de estatus.
- Folio manual propenso a errores cuando llegaban dos eventos para el mismo día.

---

## Modo de trabajo con Bruno

Igual que en Inmuebles Audiovisuales: Bruno es el dueño del negocio, no un desarrollador.

- Guiar paso a paso en cada acción técnica.
- Antes de empezar cualquier archivo, explicar en una oración qué hace y por qué se construye en ese orden.
- Advertir antes de que algo pueda salir mal.
- No avanzar al siguiente archivo sin confirmar que el anterior funciona.
- Cuando Bruno copie un ID o URL, pedirle que lo pegue en el chat para verificar antes de usarlo.

---

## Reglas de escritura

- Acentos, ñ y caracteres especiales en todo texto visible: cláusulas, etiquetas, correos, mensajes de UI.
- Sin acentos en nombres de variables, claves de objetos, columnas camelCase, claves de paquetes, placeholders de template.
- Sin emojis en ningún archivo entregable.
- Sin em dashes en comentarios de código.
- Respuestas en español formal, sin coloquialismos.

---

## Mejoras planeadas (sesión del 23 de mayo de 2026)

Las siguientes funciones están diseñadas y aprobadas pero no construidas aún. Se construyen en sesiones posteriores.

### Panel financiero (admin)

Sección nueva en el admin con dos vistas:

**Metas del mes** (agrupado por fecha de evento)
- Contratos del mes con su margen estimado: Precio − CostoVariable(paquete) − GastosVariablesExtra − costos fijos prorrateados.
- Progreso visual hacia la meta de margen mensual ($62,833 MXN).
- Reinicio automático cada mes. Historial de déficits de meses anteriores.

**Flujo de caja** (agrupado por fecha de pago)
- Pagos recibidos en el mes calendario (anticipo + liquidaciones).
- Costos fijos del mes (leídos de Configuracion1 + valores fijos).
- Saldo neto disponible.

Hojas nuevas requeridas: `Configuracion1` (Mes, PresupuestoAnuncios).
Columnas nuevas requeridas: `CostoVariable` en Paquetes1, `GastosVariablesExtra` en Contratos1.

### Reagendamiento sin modificar contrato

Botón en el sidepanel del admin que abre un modal con selector de fecha y hora. Actualiza `FechaEvento` y `HoraEvento` en Contratos1 y modifica el evento de Google Calendar existente (sin crear uno nuevo). El contrato firmado no se regenera.

### Portal mejorado

- **Cuestionario simplificado:** solo `NombrePareja` es obligatorio; los demás campos son opcionales y quedan visibles para el equipo en el admin.
- **Saludo personalizado:** el portal muestra "Hola, [NombreCliente]" al cargar.
- **Instrucciones por locación:** en estatus `Reservado`, se muestra la guía de llegada y logística según la locación del evento (contenido en `07. _docs/GuiasCliente_v1.md`).
- **Captura de datos en portal:** el cliente ingresa su propio teléfono y correo al firmar, en lugar de depender solo de los datos que Bruno capturó al crear el contrato.

### Automatizaciones (triggers)

- **3 días antes del evento:** recordatorio de pago al cliente si hay saldo pendiente.
- **2 días antes del evento:** alerta a Bruno con resumen del evento (espacio, hora, saldo).
- **Al confirmar la reservación:** recordatorio a Bruno de coordinar con proveedor de letras (si aplica) y proveedor de pétalos.
- **Fecha de entrega:** evento en Google Calendar cuando Bruno marca "Evento completado, iniciar edición". Con urgencia extra si el contrato tiene ADD-EXPRESS.

### CRM de prospectos

Hoja nueva `Prospectos1` con: Nombre, Telefono, FechaContacto, Fuente (Instagram/TikTok/Referido/otro), Paquete de interés, Estatus (Activo/Cerrado/Perdido), FechaSeguimiento, Notas. Vista en el admin con filtros y tasa de conversión.

### Notificaciones a Bruno (push o WhatsApp)

- Al firmar un contrato: notificación con folio y monto.
- Al registrar un abono: notificación con monto y saldo pendiente.
- 2 días antes de un evento: alerta con resumen.

### Reportes

- Paquetes más vendidos (por mes y acumulado).
- Tiempo promedio de cierre (FechaCreacion a FechaFirma).
- Canal de marketing más efectivo (requiere campo Fuente en Contratos1 o Prospectos1).

---

## Reglas críticas

1. Todo en español: código, comentarios, variables, columnas del Sheets.
2. Sin emojis en ningún archivo entregable.
3. Sin em dashes — usar punto y seguido o coma.
4. Código completo y funcional. No dar fragmentos con instrucciones de completar.
5. Antes de cualquier cambio, resumir qué se va a tocar y esperar confirmación.
6. Auditoría obligatoria al terminar cada archivo: buscar tokens/IDs que se generan en un lugar y se usan con otro valor, funciones cuyo retorno se ignora, flujos con estado inconsistente, estatus sobreescritos incorrectamente, tiempos de expiración que pueden vencer antes de la siguiente acción del flujo.
