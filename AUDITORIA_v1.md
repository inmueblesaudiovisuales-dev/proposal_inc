# AUDITORIA v1 — Sistema de Contratos Proposal Inc

*Auditoría estática y de razonamiento. Sin acceso a Google Workspace: no se ejecutó código contra Sheets, Drive, Gmail ni Calendar.*

Fecha de auditoría: 4 de junio de 2026.
Alcance: `ScriptContratos1_v1.js` (3,624 líneas), `admin.html`, `portal.html`, `aceptar.html`, `pago.html`, `terminos.html`, `setup.js`, `actualizarPaquetes_v2.js`, `disponibilidad-admin.html`, `disponibilidad-rincon-admin.html`.

> Nota sobre la rama. El prompt pedía trabajar en `auditoria/fixes-v1`. El entorno administrado de esta sesión obliga a desarrollar en la rama `claude/charming-faraday-lDPRw`. Todas las correcciones se aplicaron ahí, NO en `main`. El contenido de los commits es idéntico al que iría en `auditoria/fixes-v1`.

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | IDs |
|-----------|----------|-----|
| Crítico | 3 | A-01, A-02, A-03 |
| Importante | 7 | A-04, A-05, A-06, A-07, A-08, A-09, A-23 |
| Menor | 8 | A-10 … A-17 |
| Cosmético | 5 | A-18 … A-22 |

**Correcciones aplicadas en esta rama (6):** A-04 (race de doble evento de Calendar), A-05 (doble clic en confirmar reservación, frontend), A-11 (bypass de confirmación en borrado individual), y limpieza de reglas de escritura A-18 (em dash en comentarios), A-19 (emoji en pago.html), A-20 (nombre del dueño en comentario de portal.html).

**No corregidas por decisión de negocio / falta de dato (quedan como preguntas abiertas):** A-01, A-02, A-03 (dependen del dueño: ver sección 6), A-06, A-07.

El sistema, en su flujo principal (`admin.html` + `portal.html` + backend), está bien construido y ya pasó varias rondas de auditoría previas. Los hallazgos críticos NO son fallas de lógica del flujo feliz, sino: (1) datos faltantes en producción que el backend asume poblados (CostoVariable), (2) páginas cliente huérfanas que no están conectadas al backend (`aceptar.html`, `pago.html`) con datos bancarios de prueba y un error tipográfico en el titular, y (3) un riesgo de zona horaria en la creación de eventos de Calendar.

---

## 2. Hallazgos detallados

### CRÍTICOS

#### A-01 — `CostoVariable` no poblado en producción: el panel financiero calcula márgenes inflados
- **Archivo/línea:** `actualizarPaquetes_v2.js:163-175` vs `ScriptContratos1_v1.js:2140-2158` (`accionObtenerPanelFinanciero1`).
- **Descripción:** El backend calcula la ganancia con `gananciaTotalContrato = precio - costoVariable - gastosVariables`, leyendo `paquete.CostoVariable` de `Paquetes1`. La migración que se corrió en la hoja de producción (`actualizarPaquetes_v2.js`) borra todas las filas de `Paquetes1` y las reinserta con **solo 9 columnas** (`appendRow` con clave, locacion, nombre, precio, esAdicional, entregables, activo, orden, componentesCombo). **No escribe la columna `CostoVariable`.** Por lo tanto, en producción `CostoVariable` queda vacío para todos los paquetes y `parseFloat(undefined) || 0 = 0`.
- **Escenario:** Abrir Análisis > Panel financiero. Con `costoVariable = 0`, el margen de cada evento se reporta como `precio - gastosVariables`, sin descontar el costo operativo real. La meta mensual y "eventos necesarios" salen optimistas.
- **Impacto:** Decisiones de negocio (cuántos eventos faltan para la meta) basadas en márgenes inflados.
- **Discrepancia de datos confirmada:** `setup.js` (instalación nueva) SÍ trae valores de `CostoVariable` (`3350, 3350, 5350, 5500, 9500, 3350, 3350, 7850, ...`), pero estos difieren de los valores mencionados en el prompt (`3850, 3650, 5650, ...`). Es decir, existen al menos dos juegos de números y ninguno está confirmado por el dueño.
- **Corrección:** NO aplicada. Requiere decisión de negocio. Ver pregunta abierta P-01. No se inventaron números.

#### A-02 — `aceptar.html` y `pago.html` están huérfanas: el backend no tiene sus endpoints
- **Archivo/línea:** `pago.html:340` (`action=datoPago`), `aceptar.html:507,658` (sin parámetro `action`).
- **Descripción:** `pago.html` llama a `action=datoPago`, que **no existe** en el enrutador `doGet` del backend (`ScriptContratos1_v1.js:439-453`). `aceptar.html` hace GET y POST **sin enviar ningún parámetro `action`**, por lo que el backend responde "Acción GET/POST no reconocida". Además ambas tienen `CONFIG.SCRIPT_URL = 'PENDIENTE'` (`pago.html:234`, `aceptar.html:478`): la URL del backend nunca se configuró.
- **Escenario:** Cualquier intento de usar estas páginas falla por completo.
- **Impacto:** Si están enlazadas en algún correo o flujo, el cliente ve páginas rotas. El flujo real (firma + pago + descarga) vive completo en `portal.html`, que sí funciona, lo que sugiere que estas dos páginas son legado del sistema anterior.
- **Corrección:** NO se conectaron al backend (sería inventar endpoints y datos). Ver pregunta abierta P-02 (¿eliminar o reconectar?). Sí se corrigieron las violaciones de reglas de escritura en ellas (A-18, A-19).

#### A-03 — `pago.html`: titular bancario mal escrito y datos de cuenta de prueba
- **Archivo/línea:** `pago.html:238-242`.
- **Descripción:** `TITULAR: 'BRUNO GUTIERREZ SALAAR'` (falta la "Z": debería ser "SALAZAR"). Además `CLABE: '111111111111111111'`, `CUENTA: '2131231321'`, `TARJETA: '3423029332323232'` son claramente valores de prueba. El banco también difiere de `portal.html` (BBVA vs Banamex) y de `ContextoMaster_v1.md` (Banamex, CLABE `002580905411451243`).
- **Escenario:** Si esta página llegara a mostrarse, el cliente transferiría a una cuenta inexistente y a un titular mal escrito.
- **Impacto:** Pago perdido o rechazado.
- **Corrección:** NO aplicada. No se conocen los datos reales que debería tener esta página y la página está huérfana (A-02). Ver P-02. No se inventaron datos bancarios.

### IMPORTANTES

#### A-04 — Race condition: doble evento de Calendar al confirmar reservación  *(CORREGIDO)*
- **Archivo/línea:** `ScriptContratos1_v1.js`, `accionConfirmarReservacion1` (antes 3091-3158).
- **Descripción:** El `LockService` protegía solo la escritura de `ReservacionConfirmada`/`Estatus`; la creación de la carpeta de Drive y del evento de Calendar ocurría **fuera del lock**. Dos confirmaciones casi simultáneas (doble clic, reintento de red) podían: A escribe `ReservacionConfirmada` y libera el lock antes de crear el evento; B adquiere el lock, ve `ReservacionConfirmada` puesta pero `EventoCalendarioID` aún vacío, evalúa `esReintento = true` y procede; ambas crean evento de Calendar → **dos eventos duplicados** para el mismo contrato.
- **Escenario:** Doble clic en "Confirmar reservación con hotel" (el botón no se deshabilitaba: ver A-05).
- **Impacto:** Eventos de Calendar duplicados; ruido para el equipo.
- **Corrección APLICADA:** se mueve la creación de carpeta y evento **dentro del mismo lock**, con guard de idempotencia `if (!EventoCalendarioID) crear`. Los correos siguen fuera del lock, protegidos por `esReintento` (solo se envían en la primera confirmación). Se preserva la capacidad de reintentar la creación del evento si una confirmación previa falló.

#### A-05 — `confirmarReservacion`: el botón del admin no se deshabilita (doble submit)  *(CORREGIDO)*
- **Archivo/línea:** `admin.html:846`, `ejecutarConfirmarReservacion()` (2397).
- **Descripción:** El botón "Confirmar" no se deshabilitaba durante la llamada, permitiendo varios POST `confirmarReservacion` seguidos. Es el disparador frontend de A-04.
- **Corrección APLICADA:** se le agregó `id="btn-confirmar-reservacion"`, se deshabilita al iniciar la llamada y se restaura en `finally`.

#### A-06 — Zona horaria en la creación de eventos de Calendar
- **Archivo/línea:** `ScriptContratos1_v1.js:3038` (`crearEventoCalendario1`), `3602-3608` (`accionReagendarContrato1`), `2390` (`createAllDayEvent`).
- **Descripción:** Los eventos se construyen con `new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), h, m, 0)`, que usa la **zona horaria del proyecto de Apps Script**, no necesariamente `America/Monterrey`. El resto del código formatea fechas con `Utilities.formatDate(..., 'America/Monterrey', ...)` de forma explícita, lo que sugiere que la zona del proyecto podría no ser Monterrey. Si la zona del proyecto es UTC, un evento de las 7:00 p.m. se crearía 6 horas corrido.
- **Escenario:** Confirmar reservación de un evento a las 19:00; el evento de Calendar aparece a las 13:00 (o a otra hora) si la zona del proyecto difiere.
- **Impacto:** Hora equivocada en Calendar (no afecta correos al cliente, que usan `formatHoraCorreo1` sobre el string `HoraEvento`).
- **Corrección:** NO aplicada en código (no se puede verificar la zona desde el repo; `appsscript.json` no está versionado). Ver pregunta abierta P-03 y la verificación incluida en `E2E_PLAN.md`. **Recomendación:** fijar la zona del proyecto de Apps Script a `America/Monterrey` en Configuración del proyecto / `appsscript.json` (`"timeZone": "America/Monterrey"`).

#### A-07 — Restricción Isla-sábado no blindada en el panel de Rincón (rama `parcial`)
- **Archivo/línea:** `disponibilidad-rincon-admin.html`, `getEspaciosLibres` (956-960).
- **Descripción:** La regla "la Isla nunca está disponible los sábados" se aplica en la captura de chips (848) y en el estado `libre` (959), pero **no en la rama `parcial`**, que devuelve la nota tal cual. Si una fecha sábado quedó con "Isla" en su nota, el mensaje de WhatsApp generado anunciaría "Isla disponible" un sábado.
- **Impacto:** Posible promesa al cliente de un espacio no disponible. El backend de creación de contrato SÍ rechaza Isla-sábado (`accionCrearContrato1:596`), así que no se puede cerrar el contrato; el daño es de comunicación.
- **Corrección:** NO aplicada (es panel de disponibilidad, no del flujo de contrato; se prefiere dejarlo como hallazgo verificable). **Recomendación:** filtrar también en la rama `parcial`: `.filter(e => !(e === 'Isla' && dow === 6))`.

#### A-08 — Idempotencia de `registrarAbono` ante doble clic
- **Archivo/línea:** `ScriptContratos1_v1.js:1067` (`accionRegistrarAbono1`), `admin.html:1809`.
- **Descripción:** El backend no deduplica abonos: dos POST con el mismo monto registran dos filas en `Abonos1`. El frontend deshabilita el botón al inicio, lo que mitiga el doble clic, pero un reintento de red o dos pestañas podrían duplicar. No se agrega dedup en backend porque dos abonos del mismo monto pueden ser legítimos (dos pagos parciales iguales).
- **Impacto:** Abono duplicado → saldo y estatus avanzan de más. Reversible borrando la fila en `Abonos1`.
- **Corrección:** NO aplicada (riesgo de bloquear pagos legítimos). **Recomendación:** confirmación visual y/o ventana anti-rebote en el frontend.

#### A-09 — Re-foliación retroactiva puede desincronizar PDF y carpeta de Drive ya creados
- **Archivo/línea:** `ScriptContratos1_v1.js:139-169` (`asignarFolio1`), `1188` (nombre de carpeta), `2329` (`{{folio}}` en PDF).
- **Descripción:** Cuando llega un segundo evento el mismo día, el primer contrato se re-folio de `PI-YYMM.DD` a `PI-YYMM.DD-APELLIDO`. Si el primer contrato ya generó su PDF (con `{{folio}}` = `PI-YYMM.DD`) o su carpeta de Drive (con el folio sin sufijo en el nombre), esos artefactos quedan con el folio viejo mientras la hoja muestra el nuevo.
- **Impacto:** Inconsistencia cosmética de folio entre el PDF/carpeta y la hoja. No rompe ninguna referencia (todo se resuelve por `Token`, no por folio).
- **Corrección:** NO aplicada (bajo impacto, y regenerar PDF/renombrar carpeta es invasivo). Documentado para el dueño.

#### A-23 — Combos en el portal no elegían la combinación más barata (reportado por el dueño)  *(CORREGIDO)*
- **Archivo/línea:** `portal.html`, `resolverYActualizar` (~582-624).
- **Descripción:** La auto-mejora a combo solo se disparaba desde add-ons individuales. Si el cliente seleccionaba dos combos chicos que juntos equivalían a uno grande (ej. "Drone + Ambiente" $2,000 + "Camino de recuerdos + Entrega Express" $2,500), el sistema bloqueaba (grisaba) el combo grande "Todo Incluido" ($3,000) en vez de aplicarlo, dejando al cliente pagando $4,500.
- **Escenario:** Cliente marca los dos combos parciales en el portal.
- **Impacto:** Sobrecosto al cliente ($1,500 en el ejemplo); lógica al revés de lo esperado.
- **Corrección APLICADA:** se reemplazó la lógica por un optimizador que expande la selección a los servicios individuales deseados y elige la combinación de menor costo (combos + individuales) que los cubra exactamente, sin agregar servicios no pedidos. Verificado con 10 escenarios. El backend ya precia correctamente el conjunto enviado, por lo que no requirió cambios.

### MENORES

#### A-10 — Lectura de campos PascalCase vs camelCase en admin (consistente, verificar)
- `admin.html` lee `obtenerContrato` en PascalCase (`c.FechaEvento`, `c.Estatus`) y `listarContratos` en camelCase (`c.fechaEvento`, `c.estatus`). Coincide con lo que envía el backend (`accionObtenerContrato1` devuelve el objeto crudo; `accionListarContratos1` mapea a camelCase). **No es un bug**, pero es frágil: cualquier cambio de naming en un endpoint rompe la vista sin error. Recomendación: documentar el contrato por endpoint.

#### A-11 — Bypass de confirmación en borrado individual  *(CORREGIDO)*
- **Archivo/línea:** `admin.html:2043-2064`.
- **Descripción:** Si el contrato no estaba en `todosContratos` (lista filtrada), `nombre` quedaba `null` y **cualquier texto no vacío** confirmaba el borrado permanente.
- **Corrección APLICADA:** cuando no se puede resolver el nombre, ahora se exige escribir exactamente `BORRAR`, igual que el borrado masivo.

#### A-12 — `obtenerPanelFinanciero` y `actualizarMeta`: retornos de error parcialmente ignorados
- `admin.html:2704` valida con `datos.error` y no con `datos.ok`; si el backend devolviera `{ok:false}` sin `error`, se trataría como éxito y reventaría al leer `meta_mensual`. `admin.html:2750` (`actualizarMeta`) ignora `res.error` y no avisa al usuario si falla. Severidad menor (rutas poco frecuentes). No corregido para no ampliar el alcance del cambio en el admin.

#### A-13 — `botón de abono` no se re-habilita en la ruta de éxito
- **Archivo/línea:** `admin.html:1832-1837`. En éxito no se restaura el botón; depende de que `abrirPanel()` re-renderice el panel (lo que normalmente ocurre y reemplaza el elemento). Si `abrirPanel` falla en silencio, el botón queda "Registrando...". Menor; no corregido.

#### A-14 — `crearEventoEntregaSiCorresponde1`: 21 días naturales como proxy de "15 días hábiles"
- **Archivo/línea:** `ScriptContratos1_v1.js:2382`. Para entrega no-express usa `diasEntrega = 21` (calendario). El contrato dice 15 días hábiles. 21 naturales es una aproximación razonable pero no exacta. Documentado; sin corrección.

#### A-15 — `accionListarStats1`: `facturado` incluye contratos en `Pendiente firma`
- **Archivo/línea:** `ScriptContratos1_v1.js:2217-2226`. "Facturado" suma el precio de todos los contratos del periodo, incluidos los no firmados. Puede sobreestimar lo facturado real. Verificar si es el comportamiento deseado (P-05).

#### A-16 — Restricción "Safi sin alcohol los domingos" no existe en código
- El backend no modela el alcohol ni bloquea domingos en Safi (es una sustitución de menú, no un bloqueo de reserva). No es un bug de booking. Verificar si se desea una nota informativa al cliente en el portal (P-06).

#### A-17 — `adminKey` viaja en la URL (GET) en los paneles de disponibilidad
- **Archivo/línea:** `disponibilidad-admin.html:1006`, `disponibilidad-rincon-admin.html:1036`. El guardado de disponibilidad usa GET con `adminKey=framedock` en el query string (para evitar el preflight CORS). Queda en logs/historial. Es seguridad solo de interfaz (la clave ya está embebida en el cliente). Riesgo bajo; documentado.

### COSMÉTICOS

#### A-18 — Em dashes en comentarios de código  *(CORREGIDO)*
- `ScriptContratos1_v1.js:3153` (eliminado al reescribir A-04) y `:3400`; `admin.html:2545`; `aceptar.html:476`; `pago.html:232`; `terminos.html:313`. Todos corregidos a punto/dos puntos. (Quedan em dashes en *strings* visibles al cliente y de UI, que son válidos: la regla solo prohíbe em dashes en comentarios.)

#### A-19 — Emoji en `pago.html`  *(CORREGIDO)*
- `pago.html:146` tenía `⚠️` en el icono de error. Reemplazado por `!`. No se encontraron emojis en los demás archivos entregables.

#### A-20 — Nombre del dueño en comentario de `portal.html`  *(CORREGIDO)*
- `portal.html:662` mencionaba "Bruno" en un comentario de código (no visible al cliente, pero indeseable en un archivo cliente). Reescrito sin el nombre.

#### A-21 — Datos bancarios duros y divergentes entre páginas
- `portal.html:925-931` tiene la tarjeta OXXO `5544 9206 0686 5310` hardcodeada (el CLABE/cuenta sí vienen del backend). `pago.html` tiene datos totalmente distintos (A-03). Para el flujo real (portal) el dato es correcto y coincide con `CONFIG1.TARJETA`, pero conviene centralizarlo. Sin corrección (el portal funciona; consolidar es mejora, no bug).

#### A-22 — `terminos.html` describe un contrato distinto al que se firma en `portal.html`
- `terminos.html` (cláusulas estáticas: tolerancia 20 min, entrega 7 días hábiles, almacenamiento 30 días) no coincide con las cláusulas embebidas/usadas por el flujo real (tolerancia 10 min, entrega 15 días hábiles, almacenaje 14 días, no reembolsable) ni con el template del contrato de `setup.js`. `aceptar.html` (huérfana) enlaza a `terminos.html`. Como `aceptar.html`/`terminos.html` no son parte del flujo activo, el cliente que firma en `portal.html` no ve `terminos.html`. Aun así es una inconsistencia legal a resolver (P-02). Sin corrección automática.

---

## 3. Tabla de integración endpoint por endpoint

Leyenda: ✓ coincide; ⚠ observación; ✗ problema.

| Endpoint (action) | Método | Invocado desde | Parámetros enviados | Handler backend | ¿Coincide? |
|---|---|---|---|---|---|
| `obtenerPortal` | GET | portal.html:340 | token | `accionObtenerPortal1` | ✓ |
| `manejarFirmaCliente` | POST | portal.html:826 | token, firmaBase64, adicionales, nombrePareja, cancionEvento, familiaAsiste, familiaNumero, alergiasAlimentarias, origenCliente, correoCliente, telefonoCliente | `accionManejarFirmaCliente1` | ✓ |
| `crearContrato` | POST | admin.html:2101/2114 | tipoContrato, nombreCliente, correoCliente, telefonoCliente, paqueteClave/descripcionServicio, adicionales, locacion, espacioLocacion, fechaEvento, horaEvento, precio, anticipo, descuento, notasContrato, origenCliente | `accionCrearContrato1` | ✓ (codigoError `ANTICIPO_EXCEDE`/`FECHA_PASADA` no se maneja específico, cae al mensaje genérico ⚠) |
| `registrarAbono` | POST | admin.html:1818 | token, monto, metodo, notas, permitirExceso | `accionRegistrarAbono1` | ✓ (maneja `EXCEDE_SALDO`) |
| `actualizarEstatus` | POST | admin.html:1891 | token, estatus | `accionActualizarEstatus1` | ✓ |
| `guardarEntrega` | POST | admin.html:1908 | token, driveLink, linksExtra | `accionGuardarEntrega1` | ✓ |
| `revocarEntrega` | POST | admin.html:1948 | token, revocar | `accionRevocarEntrega1` | ✓ |
| `guardarProduccion` | POST | admin.html:1929 | token, fotografiaLista, videoListo | `accionGuardarProduccion1` | ✓ |
| `marcarSesionCompletada` | POST | admin.html:1977 | token | `accionMarcarSesionCompletada1` | ✓ |
| `guardarNotasInternas` | POST | admin.html:2004 | token, notas | `accionGuardarNotasInternas1` | ✓ |
| `guardarGastosVariables` | POST | admin.html:1992 | token, gastos | `accionGuardarGastosVariables1` | ✓ |
| `confirmarReservacion` | POST | admin.html:2407 | token, espacio | `accionConfirmarReservacion1` | ✓ (A-04/A-05 corregidos) |
| `actualizarEspacio` | POST | admin.html:1963 | token, espacio | `accionActualizarEspacio1` | ✓ |
| `reagendarContrato` | POST | admin.html:2612 | token, nuevaFecha, nuevaHora | `accionReagendarContrato1` | ✓ |
| `enviarRecordatorioPago` | POST | admin.html:2020 | token | `accionEnviarRecordatorioPago1` | ✓ |
| `enviarCorreoResena` | POST | admin.html:2631 | token | `accionEnviarCorreoResena1` | ✓ |
| `agregarAddonPostFirma` | POST | admin.html:1778 | token, clave / nombre+precio | `accionAgregarAddonPostFirma1` | ✓ |
| `ocultarContrato` | POST | admin.html:2035 | token | `accionOcultarContrato1` | ✓ |
| `eliminarContrato` | POST | admin.html:2057 | token | `accionEliminarContrato1` | ✓ |
| `ocultarContratosMasivo` | POST | admin.html:1397 | tokens[] | `accionOcultarContratosMasivo1` | ✓ |
| `eliminarContratosMasivo` | POST | admin.html:1397 | tokens[] | `accionEliminarContratosMasivo1` | ✓ |
| `crearPaquete`/`actualizarPaquete` | POST | admin.html:2336 | clave, claveOriginal, nombre, locacion, precio, costoVariable, entregables, componentesCombo, esAdicional, activo | `accionCrearPaquete1`/`accionActualizarPaquete1` | ✓ |
| `togglePaquete` | POST | admin.html:2363 | clave, activo | `accionTogglePaquete1` | ✓ |
| `actualizarMeta` | POST | admin.html:2749 | meta | `accionActualizarMeta1` | ⚠ (frontend ignora `res.error`) |
| `listarContratos` | GET | admin.html:1168 | estatus, buscar | `accionListarContratos1` | ✓ |
| `obtenerContrato` | GET | admin.html:1441 | token | `accionObtenerContrato1` | ✓ |
| `listarStats` | GET | admin.html:1178/2429 | periodo | `accionListarStats1` | ✓ |
| `listarPaquetes` | GET | admin.html:1033 | — | `accionListarPaquetes1` | ✓ |
| `listarPaquetesAdmin` | GET | admin.html:2256 | — | `accionListarPaquetesAdmin1` | ✓ |
| `listarClientes` | GET | admin.html:2229 | — | `accionListarClientes1` | ✓ |
| `listarReportes` | GET | admin.html:2647 | — | `accionListarReportes1` | ✓ |
| `obtenerPanelFinanciero` | GET | admin.html:2703 | — | `accionObtenerPanelFinanciero1` | ⚠ (frontend valida `error` y no `ok`) |
| `exportarCSV` | GET | admin.html:1411 | — | `accionExportarCSV1` | ✓ |
| `disponibilidadObtener` | GET | disponibilidad-admin.html:733 | desde, hasta | `accionDisponibilidadObtener1` | ✓ (público, los params desde/hasta no se usan en backend; devuelve todo) ⚠ |
| `disponibilidadGuardar` | GET | disponibilidad-admin.html:1006 | adminKey, usuario, cambios | `accionDisponibilidadGuardarGet1` | ✓ |
| `disponibilidadRinconObtener` | GET | disponibilidad-rincon-admin.html:746 | desde, hasta | `accionDisponibilidadRinconObtener1` | ✓ ⚠ |
| `disponibilidadRinconGuardar` | GET | disponibilidad-rincon-admin.html:1031 | adminKey, usuario, cambios | `accionDisponibilidadRinconGuardarGet1` | ✓ |
| `datoPago` | GET | pago.html:340 | token | **NO EXISTE** | ✗ A-02 |
| (sin action) | GET/POST | aceptar.html:507/658 | token, datos de logística | **NO EXISTE** | ✗ A-02 |

---

## 4. Edge cases evaluados

| Caso | Comportamiento actual | Veredicto |
|---|---|---|
| Anticipo = 0 | Firma pasa directo a `En produccion`; crea carpeta y evento de Calendar en la firma (single, protegido por guard de estatus) | Cubierto |
| Anticipo = 100% del precio | Permitido (`anticipo > precio` se rechaza, `==` se acepta); saldo cierra en 0 | Cubierto |
| Anticipo > precio | Rechazado con `codigoError: ANTICIPO_EXCEDE` | Cubierto (frontend muestra mensaje genérico, A-12) |
| Descuento que deja precio en 0 | Rechazado ("precio debe ser mayor a cero") | Cubierto |
| Contrato personalizado sin paquete | Sin add-ons; descripción y precio manuales | Cubierto |
| Add-ons rechazados al firmar | Solo se aceptan claves ofrecidas o combos derivados; resto ignorado | Cubierto |
| Combo detectado desde add-ons individuales | `addonsDisponibles` incluye combos cubiertos; dedup de componentes al firmar | Cubierto |
| Doble firma | Bloqueada por guard de estatus dentro del lock | Cubierto |
| Doble clic confirmar reservación | Antes: doble evento de Calendar | **Corregido (A-04/A-05)** |
| Doble clic registrar abono | Posible abono duplicado | Pregunta abierta / mitigado en frontend (A-08) |
| Reagendar un `Entregado` | Rechazado (no está en estatus reagendables) | Cubierto |
| Reagendar a fecha pasada | Rechazado (`FECHA_PASADA`) | Cubierto |
| Isla en Rincón un sábado (crear) | Rechazado en backend | Cubierto |
| Isla en Rincón un sábado (confirmar) | Rechazado en backend | Cubierto |
| Isla sábado en panel disponibilidad (parcial) | Puede anunciarse como libre | **Pregunta abierta (A-07)** |
| Safi domingo sin alcohol | No modelado (sustitución de menú) | Pregunta abierta (A-16) |
| Dos eventos el mismo día (folio) | Sufijo de apellido; re-folio del primero | Cubierto (con caveat A-09) |
| Token expirado antes de firmar (72 h) | Portal y firma rechazan | Cubierto |
| Token tras firmar | Permanente (sin expiración) | Cubierto |
| JSON corrupto en `AdicionalesJSON`/`AddonsOfrecidosJSON`/`AddonsExtraJSON` | Todos los `JSON.parse` están en `try/catch` con fallback `[]` | Cubierto |
| Cliente sin correo | Firma exige correo válido; recibos/recordatorios verifican correo antes de enviar | Cubierto |
| Evento en el pasado al crear | Rechazado (`FECHA_PASADA`) | Cubierto |
| Apellido con acentos/caracteres raros (folio) | Normaliza, quita acentos, mayúsculas, `[^A-Z0-9]`; fallback `CLIENTE` | Cubierto |
| Zona horaria fin de mes/año | `parseFecha1` usa `T12:00:00` para evitar off-by-one en fechas | Cubierto para fechas; **Calendar pendiente (A-06)** |
| Inyección de fórmula en campos de texto | `sanitizarParaSheets1` antepone `'` a `=+-@` etc. | Cubierto |

---

## 5. Pasada adversarial (intentos de romper el sistema)

- **Saldo negativo:** bloqueado. `anticipo > precio` se rechaza; `SaldoPendiente = Math.max(0, ...)`; abono que excede saldo se rechaza salvo `permitirExceso` (que entonces sube el precio para que cuadre).
- **Duplicar carpeta de Drive:** `buscarOCrearCarpeta1` es idempotente por nombre; los flujos crean carpeta solo si `CarpetaProyectoID` está vacío.
- **Duplicar evento de Calendar:** era posible vía A-04; **corregido**. Otros caminos (`actualizarEstatus` Reservado, `marcarSesionCompletada`, firma anticipo=0) ya tenían guard de `EventoCalendarioID`.
- **Saltar validación desde el portal:** el portal no permite elegir fecha/locación; el cliente solo firma. La restricción Isla-sábado se valida en el backend al crear y al confirmar, no en el cliente.
- **Estado imposible:** `accionActualizarEstatus1` impide retroceder el ciclo; `registrarAbono` y `confirmarReservacion` no degradan estatus avanzados; entrega exige `En produccion`/`Liquidado`/`Entregado`.
- **Borrado accidental:** masivo exige `BORRAR`; individual ahora exige nombre o `BORRAR` (A-11 corregido).
- **Acceso admin:** todo descansa en `adminKey = 'framedock'` embebida en el cliente. Es seguridad solo de interfaz; cualquiera con la URL del backend y la clave puede operar. Es una decisión de arquitectura conocida, no un hallazgo nuevo, pero conviene tenerla presente (P-04).

---

## 6. Preguntas abiertas para el dueño

### Estado actualizado (decisiones tomadas con el dueño)

- **P-01 (costos):** RESUELTA. El dueño proporcionó los costos. Guardados en `COSTOS_PAQUETES_v1.md`. Pendiente de su parte: capturarlos en el admin. Precios de combos y de pétalos corregidos al catálogo actual (commit de precios).
- **P-02 (páginas huérfanas):** RESUELTA. `aceptar.html`, `pago.html` y `terminos.html` eliminadas del repo por decisión del dueño.
- **P-03 (zona horaria):** RESUELTA. El dueño confirma que los eventos de Calendar ya salen con la hora correcta. La zona del proyecto está bien. Sin acción. (A-06 deja de ser un riesgo en la práctica.)
- **P-04 (seguridad admin):** RESUELTA. Se deja la clave `framedock` como está, por ser un equipo pequeño de confianza. A endurecer en el futuro si crece el equipo.
- **P-05 (Facturado):** RESUELTA y APLICADA. "Facturado", ticket promedio, top clientes y la gráfica mensual ahora solo cuentan contratos firmados y abonados. Las métricas de pipeline siguen contando todos.
- **P-06 (aviso domingos Safi):** RESUELTA. El dueño lo seguirá manejando por WhatsApp. Sin cambio.
- **P-07 (folio re-foliado en PDF):** Sin decisión por ahora. Se deja como está (no se regenera el PDF). El dueño puede retomarlo después.

### Detalle original de las preguntas

- **P-01 (CostoVariable — bloquea el panel financiero):** ¿Con qué valor de `CostoVariable` debe quedar cada paquete y add-on en `Paquetes1` de producción? Existen dos juegos de números sin confirmar: el de `setup.js` (`SAFI-MINIMALISTA 3350`, `SAFI-CORAZON 3350`, `SAFI-LETRAS 5350`, `RINCON-MINIMALISTA 5500`, `RINCON-LETRAS 9500`, `NOV-CENA 3350`, `NOV-CORAZON 3350`, `NOV-LETRAS 7850`, add-ons varios) y el mencionado en el prompt (`3850, 3650, 5650, ...`). No se inventó ningún número. Una vez confirmados, se poblará la columna `CostoVariable` en `Paquetes1`.
- **P-02 (páginas huérfanas):** ¿`aceptar.html` y `pago.html` siguen en uso? El backend no tiene sus endpoints (`datoPago`, ni handler sin `action`) y su `SCRIPT_URL` es `PENDIENTE`. Opciones: (a) eliminarlas del repo; (b) reconectarlas (requiere crear endpoints y darme los datos bancarios reales). Lo mismo aplica a `terminos.html`, cuyas cláusulas no coinciden con el contrato real (A-22).
- **P-03 (zona horaria):** ¿La zona del proyecto de Apps Script es `America/Monterrey`? Si no, los eventos de Calendar saldrán con la hora corrida (A-06). Recomendación: fijarla a `America/Monterrey`.
- **P-04 (seguridad admin):** ¿Se acepta que la clave `framedock` viva en el cliente y viaje en la URL al guardar disponibilidad (A-17)? Si se quiere endurecer, habría que mover la autenticación.
- **P-05:** ¿"Facturado" en métricas debe incluir contratos en `Pendiente firma` (A-15) o solo firmados?
- **P-06:** ¿Se desea una nota al cliente sobre "sin alcohol los domingos en Safi" en el portal (A-16)?
- **P-07 (folio):** ¿Importa la inconsistencia de folio en PDF/carpeta cuando se re-folio un contrato por un segundo evento el mismo día (A-09)? Si importa, se puede regenerar el PDF y renombrar la carpeta.

---

## 7. Commits de esta rama

Ver `git log`. Cada corrección va en un commit atómico con mensaje en español que explica el bug y el fix. Las correcciones que dependían de una decisión de negocio NO se aplicaron (quedan como preguntas abiertas).
