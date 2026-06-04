# E2E_PLAN — Guión de prueba de punta a punta

Sistema de Contratos Proposal Inc v1.0. Para que el dueño lo ejecute manualmente **una vez desplegado** (Apps Script publicado, HTML en Cloudflare Pages, `setup.js` ya corrido).

Convención de cada paso: **Acción** (qué hacer) · **Dato** (qué usar) · **Esperado** (qué debe pasar) · **Verificar en** (dónde comprobarlo).

> Antes de empezar, usar un correo de prueba propio como "cliente" para recibir los correos automáticos. Marcar `CONFIG1.MODO_BORRADOR = true` en pruebas si se prefiere que los correos queden como borradores en Gmail en vez de enviarse.

---

## Fase 0 — Preparación e infraestructura

**0.1 Verificar setup**
- Acción: abrir el Sheets `Contratos v1 — Proposal Inc`.
- Esperado: existen las pestañas `Contratos1`, `Tokens1`, `Abonos1`, `Paquetes1`, `Configuracion1`, `DisponibilidadSafi`, `DisponibilidadSafi Log`, `DisponibilidadRincon`, `DisponibilidadRinconLog`.
- Verificar en: Sheets.

**0.2 CostoVariable poblado (ver P-01 de la auditoría)**
- Acción: revisar la columna `CostoVariable` en `Paquetes1`.
- Esperado: cada paquete y add-on tiene un valor numérico. **Si está vacía, el panel financiero dará márgenes inflados.** Poblar con los valores que confirme el dueño antes de confiar en el panel financiero.
- Verificar en: `Paquetes1`.

**0.3 Triggers instalados**
- Acción: en el editor de Apps Script ejecutar `instalarTriggers1` una vez. Abrir Activadores.
- Esperado: 5 triggers: `procesarPDFsPendientes1` (cada minuto), `recordatorio24h1` (cada hora), `detectarPDFsAtascados1` (diario 9:00), `limpiarTokensViejos1` (domingo 3:00), `respaldarSheets1` (lunes 9:00).
- Verificar en: Apps Script > Activadores.

**0.4 Permisos de Calendar/Drive/Gmail**
- Acción: ejecutar `testCalendarCrearYBorrar1`, `testDriveCrearYBorrar1` y `enviarCorreoTest1` desde el editor.
- Esperado: logs "Calendar end-to-end OK", "Drive end-to-end OK" y llega el correo de prueba.
- Verificar en: Logs de Apps Script y bandeja del `EMAIL_ADMIN`.

**0.5 Zona horaria (ver A-06 / P-03)**
- Acción: en Apps Script > Configuración del proyecto, revisar la zona horaria.
- Esperado: `America/Monterrey`. Si no lo es, ajustarla antes de crear eventos reales, o los eventos de Calendar saldrán con la hora corrida.

---

## Fase 1 — Camino feliz completo (contrato estándar, anticipo 50%)

**1.1 Crear contrato**
- Acción: en `admin.html` (clave `framedock`), Crear contrato > tipo Estándar.
- Dato: nombre `Cliente Prueba Uno`, correo (el tuyo de prueba), teléfono `8112345678`, paquete `Safi Corazón`, fecha del evento dentro de 30 días, hora `19:00`, anticipo dejar en automático (50%), origen `WhatsApp`.
- Esperado: aparece un enlace de portal y un enlace de WhatsApp; el contrato queda en `Pendiente firma`.
- Verificar en: `Contratos1` (fila nueva, `Estatus = Pendiente firma`, `Precio = 8000`, `SaldoPendiente = 8000`, `Anticipo = 4000`, `Folio = PI-YYMM.DD`). `Tokens1` tiene una fila con `Expira` a 72 h.

**1.2 Abrir el portal como cliente**
- Acción: abrir el enlace del portal.
- Esperado: se ve el resumen (paquete, fecha, hora, descripción), locación neutral (NO el nombre del establecimiento), desglose de precio (Total 8,000 / Anticipo 50% / Saldo), add-ons ofrecidos si los hubo, términos, cuestionario y el canvas de firma. El botón Firmar está deshabilitado.
- Verificar en: navegador.

**1.3 Firmar**
- Acción: llenar `Nombre de la pareja`, opcionalmente canción/familia/alergias, trazar la firma, escribir el correo, Firmar.
- Esperado: confirmación de firma. Estatus pasa a `Firmado`.
- Verificar en: `Contratos1` (`Estatus = Firmado`, `FechaFirma` con timestamp, `NombrePareja` lleno, `FirmaBase64URL` con un ID de Drive temporal). Llega correo "Contrato firmado" al admin.

**1.4 PDF diferido (trigger cada minuto)**
- Acción: esperar 1-2 minutos.
- Esperado: llega al cliente el correo "Tu contrato firmado" con el PDF adjunto. El PDF muestra folio, datos, fecha de firma y la imagen de la firma.
- Verificar en: bandeja del cliente; `Contratos1.PdfContratoUrl` ahora tiene URL; `FirmaBase64URL` quedó vacío (firma temporal borrada). Carpeta Drive `02. Contratos Firmados` tiene el PDF.

**1.5 Registrar anticipo**
- Acción: en el admin, abrir el contrato > General > Registrar abono.
- Dato: monto `4000`, método `Transferencia`.
- Esperado: "Abono registrado". Estatus pasa a `Anticipo recibido`, saldo `4000`. Llega al cliente el correo "Recibo de pago".
- Verificar en: `Abonos1` (1 fila, monto 4000); `Contratos1` (`SaldoPendiente = 4000`, `Estatus = Anticipo recibido`, `FechaUltimoAbono`).

**1.6 Confirmar reservación con hotel**
- Acción: en General, botón "Confirmar reservación con hotel" > elegir espacio `Terraza Principal` > Confirmar.
- Esperado: el botón se deshabilita mientras procesa (A-05). Estatus pasa a `Reservado`. Llega al cliente el correo "Tu reservación está confirmada" y al admin el de coordinación interna.
- Verificar en: `Contratos1` (`Estatus = Reservado`, `EspacioLocacion = Terraza Principal`, `ReservacionConfirmada` con timestamp, `CarpetaProyectoID` lleno, `EventoCalendarioID` lleno). En Drive: carpeta `01. Proyectos/[Año]/[MM. Mes]/PI-... — Cliente Prueba Uno/` con subcarpetas `Fotos` y `Video`. En Calendar: **un solo** evento a las 7:00 p.m. (verificar la hora; ver A-06).

**1.7 Prueba de idempotencia de la confirmación (A-04)**
- Acción: volver a abrir el modal de confirmar reservación e intentar confirmar de nuevo (si el botón aún aparece) o hacer doble clic muy rápido en el paso 1.6.
- Esperado: NO se crea un segundo evento de Calendar ni se reenvía el correo al cliente. El backend responde "La reservación ya fue confirmada anteriormente." si ya hay evento.
- Verificar en: Calendar (sigue habiendo un solo evento del contrato).

**1.8 Liquidar saldo**
- Acción: registrar un segundo abono.
- Dato: monto `4000`.
- Esperado: saldo `0`, estatus `Liquidado`. Llega "Recibo de pago" con saldo 0.
- Verificar en: `Abonos1` (2 filas), `Contratos1` (`SaldoPendiente = 0`, `Estatus = Liquidado`).

**1.9 Iniciar producción**
- Acción: pestaña Producción > "Evento completado, iniciar edición".
- Esperado: estatus `En produccion`. Se crea (si no existía) el evento de entrega en Calendar.
- Verificar en: `Contratos1` (`Estatus = En produccion`, `SesionCompletada`, `EventoEntregaCalendarioID`). En Calendar: evento de entrega ~21 días después (o 1 día si tuviera ADD-EXPRESS).

**1.10 Marcar foto/video listos**
- Acción: en Producción marcar Fotografía lista y Video listo.
- Esperado: se guardan sellos de fecha.
- Verificar en: `Contratos1` (`FotografiaLista`, `VideoListo` con timestamp).

**1.11 Entregar material**
- Acción: pestaña Entrega > pegar el link de la carpeta de Drive (pre-llenado desde `CarpetaProyectoID`) > Enviar al cliente.
- Esperado: estatus `Entregado`. Llega al cliente el correo "Tu material está listo".
- Verificar en: `Contratos1` (`Estatus = Entregado`, `EntregaDriveLink`, `FechaEntrega`). En el portal del cliente: aparece el botón de descarga.

**1.12 Revocar y reactivar entrega**
- Acción: en Entrega, Revocar acceso; recargar el portal del cliente; luego Reactivar.
- Esperado: con revocado, el portal oculta los links y muestra mensaje neutro con WhatsApp. Al reactivar, vuelven los links. (Re-enviar la entrega NO manda un segundo correo.)
- Verificar en: portal del cliente y `Contratos1.EntregaRevocada`.

---

## Fase 2 — Caso anticipo = 0

**2.1** Acción: crear contrato estándar con **anticipo `0`** (escribir 0 explícitamente).
- Dato: cliente `Cliente Cero`, fecha futura.
- Esperado: al firmar en el portal, el contrato salta directo a `En produccion`; se crea carpeta de Drive y evento de Calendar en ese momento.
- Verificar en: `Contratos1` (`Estatus = En produccion`, `Anticipo = 0`, `CarpetaProyectoID` y `EventoCalendarioID` llenos tras la firma).

---

## Fase 3 — Contrato personalizado

**3.1** Acción: crear contrato tipo Personalizado.
- Dato: cliente `Cliente Personalizado`, dirección libre `Rooftop privado, San Pedro`, descripción libre, precio `15000`, anticipo `7500`.
- Esperado: contrato creado sin paquete ni add-ons; el portal muestra el resumen sin mencionar locaciones del catálogo.
- Verificar en: `Contratos1` (`TipoContrato = personalizado`, `PaqueteNombre = Personalizado`, `DescripcionServicio` con el texto libre, `Precio = 15000`).

---

## Fase 4 — Restricción Isla en Rincón los sábados

**4.1** Acción: intentar crear un contrato con locación `Rincón de Santiago`, espacio `Isla`, fecha en un **sábado**.
- Esperado: el backend rechaza con "La Isla de Rincón de Santiago no está disponible los sábados."
- Verificar en: mensaje de error en el admin; no se crea fila en `Contratos1`.

**4.2** Acción: crear ese contrato en un día NO sábado y luego intentar confirmar reservación con espacio `Isla` tras cambiar la fecha del evento a un sábado (reagendar) y reconfirmar.
- Esperado: la confirmación con Isla en sábado también se rechaza.
- Verificar en: mensaje de error.

---

## Fase 5 — Reagendamiento

**5.1** Acción: en un contrato `Reservado`, usar el botón de reagendar.
- Dato: nueva fecha (futura), nueva hora `20:00`.
- Esperado: se actualiza `FechaEvento`/`HoraEvento`; el evento de Calendar existente se mueve (NO se crea uno nuevo); llega al cliente el correo "Tu evento fue reagendado" con fecha anterior y nueva.
- Verificar en: `Contratos1` (`FechaEvento` nueva, `FechaReagendamiento` = fecha anterior). En Calendar: el mismo evento, movido.

**5.2** Acción: intentar reagendar un contrato `Entregado` y otro a una fecha pasada.
- Esperado: ambos rechazados (estatus no reagendable / `FECHA_PASADA`).

---

## Fase 6 — Add-ons y combos

**6.1** Acción: crear contrato ofreciendo `ADD-FOTO` y `ADD-VIDEO`. En el portal, seleccionarlos.
- Esperado: el portal detecta el combo `Audiovisual Noviazgo` y aplica su precio ($2,200) en vez de la suma individual ($2,500). El anticipo se recalcula manteniendo la proporción original (no se fuerza al 50%).
- Verificar en: desglose de precio en el portal; tras firmar, `Contratos1.AdicionalesJSON` contiene el combo (no los componentes individuales), `Precio` = base + 2200.

**6.2** Acción: en un contrato firmado, usar "Agregar servicio" (agregarAddonPostFirma) con un item del catálogo y con uno manual.
- Esperado: sube `Precio` y `SaldoPendiente`; se guarda en `AddonsExtraJSON`.
- Verificar en: `Contratos1` (`AddonsExtraJSON`, `Precio`, `SaldoPendiente` incrementados).

---

## Fase 7 — Dinero (validaciones)

**7.1** Anticipo mayor al precio: al crear, anticipo `9000` con precio `8000` → rechazado (`ANTICIPO_EXCEDE`).
**7.2** Abono que excede saldo: registrar abono mayor al saldo → aparece el modal de exceso con la opción de subir el precio (`permitirExceso`) o ajustar al saldo.
**7.3** Verificar que en todo momento `Precio − suma(Abonos) = SaldoPendiente` (salvo redondeos a entero).
- Verificar en: comparar `Precio`, `Abonos1` y `SaldoPendiente`.

---

## Fase 8 — Borrado

**8.1** Borrado individual: abrir un contrato de prueba, Eliminar, escribir el nombre del cliente.
- Esperado: se borra de `Contratos1`, `Abonos1` y `Tokens1`. Si el nombre no coincide, no borra. (Tras el fix A-11, si el contrato no se pudo resolver, pide escribir `BORRAR`.)
**8.2** Borrado masivo: seleccionar 2 contratos de prueba, Eliminar, confirmar y escribir `BORRAR`.
- Esperado: solo borra si se escribe `BORRAR` exacto; elimina en cascada los seleccionados.
- Verificar en: las tres hojas ya no tienen esas filas.

---

## Fase 9 — Disponibilidad

**9.1** Safi: en `disponibilidad-admin.html` (clave `framedock`), marcar un día como `bloqueada` con nota y guardar; luego volverlo `libre`.
- Esperado: aparece/desaparece en `DisponibilidadSafi`; se registra en `DisponibilidadSafi Log`.
**9.2** Rincón: en `disponibilidad-rincon-admin.html`, marcar `parcial` un día y verificar que el chip "Isla" NO aparece en sábado. (Ver A-07: revisar también el mensaje de WhatsApp generado para un sábado parcial.)
- Verificar en: `DisponibilidadRincon` y `DisponibilidadRinconLog`.

---

## Fase 10 — Triggers y correos automáticos

**10.1 Recordatorio 24 h:** poner la `FechaEvento` de un contrato firmado para mañana; esperar a que corra `recordatorio24h1` (o ejecutarlo manual entre 9:00 y 21:00).
- Esperado: llega "Recordatorio: tu evento es mañana" una sola vez; `RecordatorioEnviado` se marca.
**10.2 Recordatorio de pago manual:** en un contrato con saldo > 0, botón "Enviar recordatorio de pago".
- Esperado: llega el correo con folio, saldo, CLABE, tarjeta OXXO, titular y WhatsApp; `UltimoRecordatorioPagoEnviado` se marca.
**10.3 Verificación de no-fuga del nombre del dueño:** revisar TODOS los correos recibidos por el cliente (contrato, recibo, confirmación, entrega, recordatorios, reseña).
- Esperado: ninguno menciona "Bruno" salvo, donde aplique, como titular de la cuenta bancaria en el recordatorio de pago. El contrato PDF sí lo nombra como "EL PRESTADOR DEL SERVICIO" (permitido).

---

## Checklist de cierre

- [ ] Flujo feliz completo (Fase 1) sin errores y con un solo evento de Calendar.
- [ ] Anticipo 0, personalizado, Isla-sábado, reagendar, combos: todos con el comportamiento esperado.
- [ ] `Precio − Abonos = SaldoPendiente` siempre cierra.
- [ ] Ningún correo al cliente filtra el nombre del dueño.
- [ ] Hora de los eventos de Calendar correcta (zona horaria).
- [ ] `CostoVariable` poblado y panel financiero con márgenes creíbles (requiere P-01).
- [ ] Decidido el destino de `aceptar.html` / `pago.html` / `terminos.html` (requiere P-02).
