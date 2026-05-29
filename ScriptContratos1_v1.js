// ScriptContratos1_v1.js. Backend del Sistema de Contratos v1 de Proposal Inc.
// Se despliega como aplicación web en Google Apps Script.
// Antes de desplegar: pegar los 3 IDs de setup.js y la URL del portal en CONFIG1.

// === Configuración ===

const CONFIG1 = {
  // IDs que imprime setup.js. Pegar aquí después de ejecutar instalar().
  SHEET_ID            : '1DaRGkVcYtpDfVnhMzX2wlcs2YTzep71NzpGSszBsYG4',
  CARPETA_SISTEMA_ID  : '1rDzWg2iihU8bXYB0A9HF42c7LQf1xbRE',
  TEMPLATE_CONTRATO_ID: '1oJPPzO53SjqtbyUpzxWVG_tNabQLyU_U_8A0QnmWlT8',

  // URL pública del portal del cliente. Pegar después de subir portal.html.
  BASE_URL_PORTAL: 'https://contratos.proposal-inc.com/portal.html',

  EMAIL_ADMIN: 'proposalincmx@gmail.com',
  WA_LINK    : 'https://wa.me/5218115080778',
  BANCO      : 'Banamex',
  CLABE      : '002580905411451243',
  CUENTA     : '1145124',
  TITULAR    : 'Bruno Gutierrez Salazar',
  TARJETA    : '5544 9206 0686 5310',

  HOJA_CONTRATOS  : 'Contratos1',
  HOJA_TOKENS     : 'Tokens1',
  HOJA_ABONOS     : 'Abonos1',
  HOJA_PAQUETES   : 'Paquetes1',
  HOJA_CONFIGURACION: 'Configuracion1',

  TOKEN_EXPIRY_HORAS: 72,

  // En false los correos se envían directamente. Cambiar a true solo en pruebas.
  MODO_BORRADOR: false,

  // Clave de administrador. Debe coincidir con la constante CLAVE_ADMIN de admin.html.
  ADMIN_KEY: 'framedock',
};

// Direcciones completas de las locaciones del catálogo. Alimentan el placeholder
// {{locacion2}} del contrato. Para contratos personalizados se usa la dirección
// que captura Bruno en la columna Locacion.
const DIRECCIONES_LOCACION1 = {
  'Safi Metropolitan' : 'Av. Lázaro Cárdenas 2400, Valle Oriente, 66260 San Pedro Garza García, N.L.',
  'Rincón de Santiago': 'Bahía Escondida, Ébano, 67300 Santiago, N.L.',
};

const ESTATUSES_VALIDOS1 = [
  'Pendiente firma', 'Firmado', 'Anticipo recibido', 'Reservado',
  'Liquidado', 'En produccion', 'Entregado',
];

// === Utilidades de fecha y formato ===

// Convierte un valor a objeto Date. A los strings sin hora les agrega T12:00:00
// para evitar el desfase de un día por zona horaria. Previene el fallo conocido 3.
function parseFecha1(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor) ? null : valor;
  const s = String(valor).trim();
  if (!s) return null;
  const d = new Date(s.indexOf('T') !== -1 ? s : s + 'T12:00:00');
  return isNaN(d) ? null : d;
}

// Formatea una fecha en español, sin hora. Ejemplo: "sábado 21 de mayo de 2026".
function formatFechaEspanol1(valor) {
  const dias  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = parseFecha1(valor);
  if (!d) return String(valor || '');
  return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
}

// Formatea un monto como pesos mexicanos. Ejemplo: 12500 produce "$12,500 MXN".
function formatMXN1(valor) {
  const num = parseFloat(String(valor).replace(/[^0-9.\-]/g, ''));
  if (isNaN(num)) return '$0 MXN';
  const entero   = Math.round(num);
  const conComas = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (entero < 0 ? '-$' : '$') + conComas + ' MXN';
}

function calcularTiempoEntregaStats1(contratos, enPeriodo) {
  const dias = [];
  contratos.forEach(function(c) {
    if (!enPeriodo(c.FechaEvento)) return;
    const fechaEvento  = parseFecha1(c.FechaEvento);
    const fechaEntrega = parseFecha1(c.FechaEntrega);
    if (!fechaEvento || !fechaEntrega) return;
    const diffDias = Math.max(0, Math.round((fechaEntrega.getTime() - fechaEvento.getTime()) / 86400000));
    dias.push(diffDias);
  });

  if (!dias.length) {
    return { promedioDias: 0, totalEntregas: 0, minimoDias: 0, maximoDias: 0 };
  }

  const suma = dias.reduce(function(acc, d) { return acc + d; }, 0);
  return {
    promedioDias: Math.round(suma / dias.length),
    totalEntregas: dias.length,
    minimoDias: Math.min.apply(null, dias),
    maximoDias: Math.max.apply(null, dias),
  };
}

// Folio base del día del evento. Ejemplo: "PI-2605.21".
function folioBase1(fechaEvento) {
  const d  = parseFecha1(fechaEvento) || new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return 'PI-' + yy + mm + '.' + dd;
}

// Extrae el apellido para el sufijo del folio: segunda palabra del nombre,
// o la última si hay más de dos. Sin acentos y en mayúsculas.
function extraerApellido1(nombre) {
  const palabras = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  let apellido;
  if (palabras.length === 0)      apellido = '';
  else if (palabras.length === 1) apellido = palabras[0];
  else if (palabras.length === 2) apellido = palabras[1];
  else                            apellido = palabras[palabras.length - 1];
  return apellido.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Decide el folio del contrato nuevo. Si ya hay un contrato ese día sin sufijo,
// devuelve también la instrucción de actualizarlo para agregarle su apellido.
// Esto evita reindexar números cuando llega un segundo evento el mismo día.
function asignarFolio1(fechaEvento, nombreCliente, contratos) {
  const base = folioBase1(fechaEvento);
  const mismoDia = contratos.filter(function(c) {
    const f = String(c.Folio || '');
    return f === base || f.indexOf(base + '-') === 0;
  });

  if (mismoDia.length === 0) {
    return { folioNuevo: base, actualizarAnterior: null };
  }

  const apellidoNuevo = extraerApellido1(nombreCliente) || 'CLIENTE';
  let actualizarAnterior = null;

  // Si el único contrato del día aún no tiene sufijo, hay que agregárselo.
  if (mismoDia.length === 1 && String(mismoDia[0].Folio) === base) {
    const apellidoPrevio = extraerApellido1(mismoDia[0].NombreCliente) || 'CLIENTE';
    actualizarAnterior = { token: mismoDia[0].Token, folio: base + '-' + apellidoPrevio };
  }

  const foliosUsados = {};
  mismoDia.forEach(function(c) { foliosUsados[String(c.Folio)] = true; });
  if (actualizarAnterior) foliosUsados[actualizarAnterior.folio] = true;

  let folioNuevo = base + '-' + apellidoNuevo;
  let n = 2;
  while (foliosUsados[folioNuevo]) {
    folioNuevo = base + '-' + apellidoNuevo + n;
    n++;
  }
  return { folioNuevo: folioNuevo, actualizarAnterior: actualizarAnterior };
}

// === Helpers de infraestructura ===

function jsonResponse1(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Previene la inyección de fórmulas en Sheets. Previene el fallo conocido 7.
function sanitizarParaSheets1(val) {
  if (typeof val !== 'string') return val;
  return /^[=+\-@\t\r]/.test(val) ? "'" + val : val;
}

// Escapa texto para insertarlo en el HTML de los correos.
function htmlEsc1(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sinAcentos1(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function enviarCorreo1(para, asunto, htmlBody, adjuntos) {
  if (!para || !String(para).trim()) return;
  const opciones = { htmlBody: htmlBody };
  if (adjuntos && adjuntos.length) opciones.attachments = adjuntos;
  if (CONFIG1.MODO_BORRADOR) {
    GmailApp.createDraft(para, asunto, '', opciones);
    Logger.log('CORREO BORRADOR para ' + para + ' | ' + asunto);
  } else {
    MailApp.sendEmail(para, asunto, '', opciones);
    Logger.log('CORREO ENVIADO para ' + para + ' | ' + asunto);
  }
}

function buscarOCrearCarpeta1(nombre, carpetaPadre) {
  const iter = carpetaPadre.getFoldersByName(nombre);
  if (iter.hasNext()) return iter.next();
  return carpetaPadre.createFolder(nombre);
}

// === Acceso a hojas ===

function getHoja1(nombre) {
  const ss   = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error('Hoja no encontrada: ' + nombre);
  return hoja;
}

function getContratosSheet1() { return getHoja1(CONFIG1.HOJA_CONTRATOS); }
function getTokensSheet1()    { return getHoja1(CONFIG1.HOJA_TOKENS);    }
function getAbonosSheet1()    { return getHoja1(CONFIG1.HOJA_ABONOS);    }
function getPaquetesSheet1()  { return getHoja1(CONFIG1.HOJA_PAQUETES);  }

// === Tokens ===

function generarToken1() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 24);
}

// El token de portal usa el mismo identificador que el contrato. Se crea con
// 72 horas de vigencia para la firma. Después de firmar se vuelve permanente.
function crearTokenPortal1(contratoToken) {
  const expira = new Date(Date.now() + CONFIG1.TOKEN_EXPIRY_HORAS * 3600 * 1000).toISOString();
  getTokensSheet1().appendRow([contratoToken, contratoToken, 'contrato', expira, false]);
}

function obtenerToken1(token) {
  const datos = getTokensSheet1().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(token)) {
      return {
        token      : datos[i][0],
        contratoID : datos[i][1],
        tipo       : datos[i][2],
        expira     : datos[i][3],
        usado      : datos[i][4] === true || datos[i][4] === 'TRUE',
        fila       : i + 1,
      };
    }
  }
  return null;
}

function estaTokenVigente1(t) {
  if (!t) return false;
  if (t.usado) return false;
  if (!t.expira) return true; // sin fecha de expiración: permanente
  return new Date() < new Date(t.expira);
}

// Después de firmar, el token deja de expirar para que el cliente pueda volver
// al portal durante todo el ciclo de vida del contrato.
function volverTokenPermanente1(token) {
  const hoja  = getTokensSheet1();
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(token)) {
      hoja.getRange(i + 1, 4).setValue('');
      hoja.getRange(i + 1, 5).setValue(false);
      return;
    }
  }
}

// === Contratos1 ===

const COLS_CONFIGURACION1 = ['Mes','PresupuestoAnuncios','MetaMensual'];

const COLS_CONTRATOS1 = [
  'Token','Folio','TipoContrato','NombreCliente','CorreoCliente',
  'TelefonoCliente','PaqueteClave','PaqueteNombre','AdicionalesJSON','AddonsOfrecidosJSON','Locacion',
  'EspacioLocacion','DescripcionServicio','Precio','Anticipo','SaldoPendiente',
  'Estatus','FechaCreacion','FechaEvento','HoraEvento','FechaFirma',
  'FechaUltimoAbono','FechaEntrega','FirmaBase64URL','PdfContratoUrl','EntregaDriveLink',
  'EntregaLinksExtra','CarpetaProyectoID','NotasContrato','NotasInternas','SesionCompletada',
  'RecordatorioEnviado','FotografiaLista','VideoListo','EntregaRevocada','Oculto',
  'NombrePareja','CancionEvento','FamiliaAsiste','FamiliaNumero','AlergiasAlimentarias',
  'GastosVariablesExtra','ReservacionConfirmada',
  'Descuento','AvisoSinFirmaEnviado','EncuestaEnviada','OrigenCliente',
  'EventoCalendarioID','FechaReagendamiento',
  'RecordatorioSaldoEnviado','AlertaBrunoEnviada','EventoEntregaCalendarioID',
  'UltimoRecordatorioPagoEnviado',
];

function crearFilaContrato1(datos) {
  const fila = COLS_CONTRATOS1.map(function(col) {
    const v = datos[col] !== undefined ? datos[col] : '';
    return typeof v === 'string' ? sanitizarParaSheets1(v) : v;
  });
  getContratosSheet1().appendRow(fila);
}

function obtenerContrato1(token) {
  const datos = getContratosSheet1().getDataRange().getValues();
  const enc   = datos[0];
  const colTok = enc.indexOf('Token');
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colTok]) === String(token)) {
      const obj = {};
      enc.forEach(function(col, j) { obj[col] = datos[i][j]; });
      obj._fila = i + 1;
      return obj;
    }
  }
  return null;
}

function actualizarContrato1(token, cambios) {
  const hoja  = getContratosSheet1();
  const datos = hoja.getDataRange().getValues();
  const enc   = datos[0];
  const colTok = enc.indexOf('Token');
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colTok]) === String(token)) {
      const fila = i + 1;
      Object.keys(cambios).forEach(function(col) {
        const j = enc.indexOf(col);
        if (j !== -1) {
          const v = cambios[col];
          hoja.getRange(fila, j + 1).setValue(typeof v === 'string' ? sanitizarParaSheets1(v) : v);
        }
      });
      return true;
    }
  }
  return false;
}

// Lee todos los contratos como objetos. Se usa para listados y para el folio.
function leerContratos1() {
  const datos = getContratosSheet1().getDataRange().getValues();
  const enc   = datos[0];
  const lista = [];
  for (let i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    const obj = {};
    enc.forEach(function(col, j) { obj[col] = datos[i][j]; });
    obj._fila = i + 1;
    lista.push(obj);
  }
  return lista;
}

// === Abonos1 ===

function registrarAbonoFila1(contratoToken, monto, metodo, notas) {
  const id  = generarToken1().substring(0, 12);
  const hoy = new Date();
  getAbonosSheet1().appendRow([
    id, contratoToken, parseFloat(monto) || 0,
    sanitizarParaSheets1(String(metodo || '')), hoy, hoy,
    sanitizarParaSheets1(String(notas || '')),
  ]);
  return id;
}

function obtenerAbonos1(contratoToken) {
  const datos = getAbonosSheet1().getDataRange().getValues();
  const enc   = datos[0];
  const colTok = enc.indexOf('ContratoToken');
  const abonos = [];
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colTok]) === String(contratoToken)) {
      const obj = {};
      enc.forEach(function(col, j) { obj[col] = datos[i][j]; });
      abonos.push(obj);
    }
  }
  return abonos;
}

// === Paquetes1 ===

// Reconoce los valores afirmativos de las columnas Si/No del Sheets.
// Contempla 'Sí' con tilde, que en mayúsculas produce 'SÍ'. Previene el fallo 1.
function esSi1(val) {
  if (val === true || val === 1) return true;
  const s = String(val).trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1';
}

function obtenerPaquetesActivos1() {
  const datos = getPaquetesSheet1().getDataRange().getValues();
  const enc   = datos[0];
  const lista = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = {};
    enc.forEach(function(col, j) { fila[col] = datos[i][j]; });
    if (!fila.Clave) continue;
    if (!esSi1(fila.Activo)) continue;
    fila.Precio      = parseFloat(fila.Precio) || 0;
    fila.EsAdicional = esSi1(fila.EsAdicional);
    fila.Activo      = true;
    lista.push(fila);
  }
  lista.sort(function(a, b) { return (a.Orden || 0) - (b.Orden || 0); });
  return lista;
}

function obtenerPaquete1ByClave(clave) {
  const lista = obtenerPaquetesActivos1();
  for (let i = 0; i < lista.length; i++) {
    if (String(lista[i].Clave) === String(clave)) return lista[i];
  }
  return null;
}

// === Enrutamiento ===

// Acciones GET que requieren la clave de administrador. Previene el fallo 6.
const ACCIONES_ADMIN_GET1 = {
  listarContratos: true, obtenerContrato: true, listarStats: true,
  listarPaquetesAdmin: true, exportarCSV: true, listarClientes: true,
  listarReportes: true, obtenerPanelFinanciero: true,
  // disponibilidadObtener es público: no se incluye aquí.
};

function doGet(e) {
  const accion = (e.parameter.action || '').trim();
  try {
    if (ACCIONES_ADMIN_GET1[accion] && e.parameter.adminKey !== CONFIG1.ADMIN_KEY) {
      return jsonResponse1({ error: 'No autorizado' });
    }
    if (accion === 'listarContratos')     return accionListarContratos1(e);
    if (accion === 'obtenerContrato')     return accionObtenerContrato1(e);
    if (accion === 'obtenerPortal')       return accionObtenerPortal1(e);
    if (accion === 'listarPaquetes')      return accionListarPaquetes1(e);
    if (accion === 'listarPaquetesAdmin') return accionListarPaquetesAdmin1(e);
    if (accion === 'listarStats')         return accionListarStats1(e);
    if (accion === 'listarClientes')      return accionListarClientes1(e);
    if (accion === 'exportarCSV')         return accionExportarCSV1(e);
    if (accion === 'listarReportes')         return accionListarReportes1(e);
    if (accion === 'obtenerPanelFinanciero') return accionObtenerPanelFinanciero1(e);
    if (accion === 'disponibilidadObtener')      return accionDisponibilidadObtener1(e);
    if (accion === 'disponibilidadGuardar')      return accionDisponibilidadGuardarGet1(e);
    if (accion === 'disponibilidadRinconObtener') return accionDisponibilidadRinconObtener1(e);
    if (accion === 'disponibilidadRinconGuardar') return accionDisponibilidadRinconGuardarGet1(e);
    return jsonResponse1({ error: 'Acción GET no reconocida: ' + accion });
  } catch (err) {
    Logger.log('ERROR doGet [' + accion + ']: ' + err.message);
    return jsonResponse1({ error: err.message });
  }
}

// Acciones POST que requieren la clave de administrador.
const ACCIONES_ADMIN1 = {
  crearContrato: true, registrarAbono: true, guardarEntrega: true,
  actualizarEstatus: true, ocultarContrato: true, eliminarContrato: true,
  ocultarContratosMasivo: true, eliminarContratosMasivo: true,
  guardarNotasInternas: true, marcarSesionCompletada: true,
  guardarProduccion: true, revocarEntrega: true,
  crearPaquete: true, actualizarPaquete: true, togglePaquete: true,
  actualizarEspacio: true,
  confirmarReservacion: true,
  guardarGastosVariables: true,
  enviarCorreoResena: true,
  reagendarContrato: true,
  actualizarMeta: true,
  disponibilidadGuardar: true,
  enviarRecordatorioPago: true,
  agregarAddonPostFirma: true,
};

function doPost(e) {
  let accion = '';
  try {
    // Soporta dos formatos: JSON puro (application/json) y form-encoded con campo
    // "payload" (application/x-www-form-urlencoded). El segundo evita el preflight
    // CORS que Apps Script no maneja, necesario para requests desde browsers sin
    // extension de CORS.
    let raw = (e.postData && e.postData.contents) ? e.postData.contents : '';
    let body;
    if (raw.startsWith('{')) {
      body = JSON.parse(raw);
    } else {
      const payload = e.parameter && e.parameter.payload ? e.parameter.payload : raw.replace(/^payload=/, '');
      body = JSON.parse(decodeURIComponent(payload.replace(/\+/g, ' ')));
    }
    accion = (body.action || '').trim();

    if (ACCIONES_ADMIN1[accion] && body.adminKey !== CONFIG1.ADMIN_KEY) {
      return jsonResponse1({ error: 'No autorizado' });
    }

    if (accion === 'crearContrato')          return accionCrearContrato1(body);
    if (accion === 'manejarFirmaCliente')    return accionManejarFirmaCliente1(body);
    if (accion === 'registrarAbono')         return accionRegistrarAbono1(body);
    if (accion === 'actualizarEstatus')      return accionActualizarEstatus1(body);
    if (accion === 'guardarEntrega')         return accionGuardarEntrega1(body);
    if (accion === 'revocarEntrega')         return accionRevocarEntrega1(body);
    if (accion === 'guardarProduccion')      return accionGuardarProduccion1(body);
    if (accion === 'marcarSesionCompletada') return accionMarcarSesionCompletada1(body);
    if (accion === 'guardarNotasInternas')   return accionGuardarNotasInternas1(body);
    if (accion === 'ocultarContrato')        return accionOcultarContrato1(body);
    if (accion === 'eliminarContrato')       return accionEliminarContrato1(body);
    if (accion === 'ocultarContratosMasivo')  return accionOcultarContratosMasivo1(body);
    if (accion === 'eliminarContratosMasivo') return accionEliminarContratosMasivo1(body);
    if (accion === 'crearPaquete')           return accionCrearPaquete1(body);
    if (accion === 'actualizarPaquete')      return accionActualizarPaquete1(body);
    if (accion === 'togglePaquete')          return accionTogglePaquete1(body);
    if (accion === 'actualizarEspacio')        return accionActualizarEspacio1(body);
    if (accion === 'confirmarReservacion')     return accionConfirmarReservacion1(body);
    if (accion === 'guardarGastosVariables')   return accionGuardarGastosVariables1(body);
    if (accion === 'enviarCorreoResena')       return accionEnviarCorreoResena1(body);
    if (accion === 'reagendarContrato')        return accionReagendarContrato1(body);
    if (accion === 'actualizarMeta')           return accionActualizarMeta1(body);
    if (accion === 'disponibilidadGuardar')    return accionDisponibilidadGuardar1(body);
    if (accion === 'enviarRecordatorioPago')   return accionEnviarRecordatorioPago1(body);
    if (accion === 'agregarAddonPostFirma')    return accionAgregarAddonPostFirma1(body);
    return jsonResponse1({ error: 'Acción POST no reconocida: ' + accion });
  } catch (err) {
    Logger.log('ERROR doPost [' + accion + ']: ' + err.message);
    return jsonResponse1({ error: err.message });
  }
}

// === Endpoint: crearContrato ===

function accionCrearContrato1(body) {
  const tipo     = (body.tipoContrato || 'estandar').toLowerCase() === 'personalizado'
    ? 'personalizado' : 'estandar';
  const nombre   = String(body.nombreCliente   || '').trim();
  const correo   = String(body.correoCliente   || '').trim();
  const telefono = String(body.telefonoCliente || '').trim();

  if (!nombre) return jsonResponse1({ error: 'El nombre del cliente es obligatorio' });

  const fechaEvento = String(body.fechaEvento || '').trim();
  if (!parseFecha1(fechaEvento)) {
    return jsonResponse1({ error: 'La fecha del evento no tiene un formato válido (se esperaba YYYY-MM-DD).' });
  }
  // BUG-014: bloquear fechas anteriores a hoy al crear. No aplica en actualizar.
  const fechaEventoDate = parseFecha1(fechaEvento);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (fechaEventoDate < hoy) {
    return jsonResponse1({ error: 'La fecha del evento no puede ser anterior a hoy.', codigoError: 'FECHA_PASADA' });
  }
  const horaEvento  = String(body.horaEvento  || '').trim();
  const locacion    = String(body.locacion        || '').trim();
  const espacio     = String(body.espacioLocacion || '').trim();

  let paqueteClave   = '';
  let paqueteNombre  = '';
  let descripcion    = '';
  let precio         = 0;
  let adicionales    = [];

  if (tipo === 'estandar') {
    paqueteClave = String(body.paqueteClave || '').trim();
    const paquete = paqueteClave ? obtenerPaquete1ByClave(paqueteClave) : null;
    if (!paquete) return jsonResponse1({ error: 'Paquete no encontrado: ' + paqueteClave });
    paqueteNombre = paquete.Nombre || paqueteClave;
    // La descripción se copia del paquete y queda fija en el contrato.
    descripcion = String(paquete.Entregables || '');
    // El precio del catálogo se autocompleta, pero Bruno puede editarlo.
    precio = (body.precio !== undefined && body.precio !== '')
      ? parseFloat(body.precio) || 0 : paquete.Precio;
    // AdicionalesJSON guarda solo las claves de add-ons que Bruno ofrece.
    if (Array.isArray(body.adicionales)) {
      adicionales = body.adicionales.filter(function(clave) {
        const p = obtenerPaquete1ByClave(clave);
        return p && p.EsAdicional;
      });
    }
  } else {
    // Contrato personalizado: todo manual, sin paquete ni add-ons.
    paqueteNombre = 'Personalizado';
    descripcion   = String(body.descripcionServicio || '').trim();
    precio        = parseFloat(body.precio) || 0;
  }

  const descuento = parseFloat(body.descuento) || 0;
  if (descuento < 0) return jsonResponse1({ error: 'El descuento no puede ser negativo' });
  precio = Math.max(0, precio - descuento);
  if (precio <= 0) return jsonResponse1({ error: 'El precio debe ser mayor a cero' });

  // Validar restricciones de locación.
  const diaEvento = parseFecha1(body.fechaEvento || '');
  if (diaEvento) {
    const diaSemana = diaEvento.getDay(); // 0=domingo, 6=sábado
    if (diaSemana === 6 &&
        sinAcentos1(body.locacion).includes('rincon') &&
        sinAcentos1(body.espacioLocacion).includes('isla')) {
      return jsonResponse1({ error: 'La Isla de Rincón de Santiago no está disponible los sábados.' });
    }
  }

  // Anticipo: si viene definido se respeta, incluso si es cero. Previene el fallo 2.
  const anticipo = (body.anticipo !== undefined && body.anticipo !== '')
    ? parseFloat(body.anticipo) || 0
    : Math.round(precio * 0.5);

  // BUG-013: anticipo mayor al precio total produce saldo negativo. Anticipo == precio es valido.
  if (anticipo > precio) {
    return jsonResponse1({ error: 'El anticipo no puede ser mayor al precio.', codigoError: 'ANTICIPO_EXCEDE' });
  }

  const token = generarToken1();

  // Folio con sufijo de apellido si hay otro evento el mismo día.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let folio = '';
  try {
    const contratos = leerContratos1();
    const resultadoFolio = asignarFolio1(fechaEvento, nombre, contratos);
    folio = resultadoFolio.folioNuevo;
    if (resultadoFolio.actualizarAnterior) {
      actualizarContrato1(resultadoFolio.actualizarAnterior.token,
        { Folio: resultadoFolio.actualizarAnterior.folio });
    }

    crearFilaContrato1({
      Token              : token,
      Folio              : folio,
      TipoContrato       : tipo,
      NombreCliente      : nombre,
      CorreoCliente      : correo,
      TelefonoCliente    : telefono,
      PaqueteClave       : paqueteClave,
      PaqueteNombre      : paqueteNombre,
      AdicionalesJSON    : JSON.stringify(adicionales),
      AddonsOfrecidosJSON: JSON.stringify(adicionales),
      Locacion           : locacion,
      EspacioLocacion    : espacio,
      DescripcionServicio: descripcion,
      Precio             : precio,
      Anticipo           : anticipo,
      SaldoPendiente     : precio,
      Estatus            : 'Pendiente firma',
      FechaCreacion      : new Date().toISOString(),
      FechaEvento        : fechaEvento,
      HoraEvento         : horaEvento,
      NotasContrato      : String(body.notasContrato || '').trim(),
      Descuento          : descuento,
      Oculto             : false,
    });

    crearTokenPortal1(token);
  } finally {
    lock.releaseLock();
  }

  const url = CONFIG1.BASE_URL_PORTAL + '?token=' + token;
  Logger.log('Contrato creado: ' + nombre + ' | folio: ' + folio + ' | tipo: ' + tipo);
  return jsonResponse1({ ok: true, token: token, folio: folio, url: url });
}

// === Endpoint: listarContratos ===

function accionListarContratos1(e) {
  const filtroEstatus = e.parameter.estatus || '';
  const filtroBuscar  = (e.parameter.buscar || '').toLowerCase();

  const contratos = leerContratos1();
  const salida = [];
  contratos.forEach(function(c) {
    if (esSi1(c.Oculto)) return;
    if (filtroEstatus && c.Estatus !== filtroEstatus) return;
    if (filtroBuscar) {
      const texto = (String(c.NombreCliente) + String(c.CorreoCliente) +
                     String(c.Folio) + String(c.TelefonoCliente)).toLowerCase();
      if (texto.indexOf(filtroBuscar) === -1) return;
    }
    salida.push({
      token           : c.Token,
      folio           : c.Folio,
      tipoContrato    : c.TipoContrato,
      nombreCliente   : c.NombreCliente,
      correoCliente   : c.CorreoCliente,
      telefonoCliente : c.TelefonoCliente,
      paqueteNombre   : c.PaqueteNombre,
      locacion        : c.Locacion,
      espacioLocacion : c.EspacioLocacion,
      precio          : c.Precio,
      anticipo        : c.Anticipo,
      saldoPendiente  : c.SaldoPendiente,
      estatus         : c.Estatus,
      fechaCreacion   : c.FechaCreacion,
      fechaEvento     : c.FechaEvento,
      horaEvento      : c.HoraEvento,
      fechaFirma      : c.FechaFirma || '',
      fechaUltimoAbono: c.FechaUltimoAbono || '',
      fechaEntrega    : c.FechaEntrega || '',
      sesionCompletada       : c.SesionCompletada || '',
      fotografiaLista        : c.FotografiaLista || '',
      videoListo             : c.VideoListo || '',
      reservacionConfirmada  : c.ReservacionConfirmada || '',
      avisoSinFirmaEnviado   : c.AvisoSinFirmaEnviado || '',
    });
  });
  salida.sort(function(a, b) {
    return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
  });
  return jsonResponse1({ ok: true, contratos: salida });
}

// === Endpoint: obtenerContrato (detalle para el admin) ===

function accionObtenerContrato1(e) {
  const token = e.parameter.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });

  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  const abonos       = obtenerAbonos1(token);
  const totalAbonado = abonos.reduce(function(s, a) { return s + (parseFloat(a.Monto) || 0); }, 0);

  let adicionalesClaves = [];
  try { adicionalesClaves = JSON.parse(contrato.AdicionalesJSON || '[]'); } catch (err) { adicionalesClaves = []; }
  const adicionalesDetalle = adicionalesClaves.map(function(clave) {
    const p = obtenerPaquete1ByClave(clave);
    return { clave: clave, nombre: p ? p.Nombre : clave, precio: p ? p.Precio : 0 };
  });

  let addonsExtra = [];
  try { addonsExtra = JSON.parse(contrato.AddonsExtraJSON || '[]'); } catch (err) { addonsExtra = []; }
  if (!Array.isArray(addonsExtra)) addonsExtra = [];

  return jsonResponse1({
    ok          : true,
    contrato    : contrato,
    abonos      : abonos.map(function(a) {
      return { id: a.ID, monto: a.Monto, metodo: a.Metodo, fecha: a.Fecha, notas: a.Notas };
    }),
    totalAbonado: totalAbonado,
    adicionales : adicionalesDetalle,
    addonsExtra : addonsExtra,
    urlPortal   : CONFIG1.BASE_URL_PORTAL + '?token=' + token,
  });
}

// === Endpoint: obtenerPortal (datos para el cliente) ===

function accionObtenerPortal1(e) {
  const token = e.parameter.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });

  const tokenData = obtenerToken1(token);
  if (!tokenData) return jsonResponse1({ error: 'Enlace inválido' });
  if (tokenData.tipo !== 'contrato') {
    return jsonResponse1({ error: 'Token no válido para este portal' });
  }

  const contrato = obtenerContrato1(tokenData.contratoID);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  // Antes de firmar se valida la vigencia del enlace. Después es permanente.
  const pendienteFirma = contrato.Estatus === 'Pendiente firma';
  if (pendienteFirma && !estaTokenVigente1(tokenData)) {
    return jsonResponse1({ error: 'El enlace ha expirado. Solicita uno nuevo a Proposal Inc.' });
  }

  const abonos       = obtenerAbonos1(tokenData.contratoID);
  const totalAbonado = abonos.reduce(function(s, a) { return s + (parseFloat(a.Monto) || 0); }, 0);

  let adicionalesClaves = [];
  try { adicionalesClaves = JSON.parse(contrato.AdicionalesJSON || '[]'); } catch (err) { adicionalesClaves = []; }
  // Expandir claves a objetos {clave, nombre, precio} para que el portal pueda mostrar desglose.
  const adicionales = adicionalesClaves.map(function(clave) {
    const p = obtenerPaquete1ByClave(clave);
    return { clave: clave, nombre: p ? p.Nombre : clave, precio: p ? p.Precio : 0 };
  });

  let addonsExtra = [];
  try { addonsExtra = JSON.parse(contrato.AddonsExtraJSON || '[]'); } catch (err) { addonsExtra = []; }
  if (!Array.isArray(addonsExtra)) addonsExtra = [];

  // addonsOfrecidos viene de AddonsOfrecidosJSON, que nunca se sobreescribe.
  // AdicionalesJSON cambia al firmar (queda con lo que el cliente aceptó), por lo que
  // no es la fuente correcta para los add-ons disponibles antes de la firma.
  let addonsOfrecidos = [];
  try { addonsOfrecidos = JSON.parse(contrato.AddonsOfrecidosJSON || '[]'); } catch (err) { addonsOfrecidos = []; }

  // Add-ons que Bruno ofreció a este cliente, para mostrarlos como opciones.
  // Solo aplica a contratos estandar y solo antes de firmar.
  // BUG-005-008: incluir tambien los combos cuyo conjunto de componentes quede
  // completamente cubierto por addonsOfrecidos. Esto permite al portal mostrar el
  // combo como opcion y aplicar su precio de descuento en lugar de la suma individual.
  let addonsDisponibles = [];
  if (pendienteFirma && contrato.TipoContrato !== 'personalizado') {
    const setOfrecidos = {};
    addonsOfrecidos.forEach(function(c) { setOfrecidos[c] = true; });

    addonsDisponibles = addonsOfrecidos.map(function(clave) {
      const p = obtenerPaquete1ByClave(clave);
      if (!p) return null;
      const componentes = p.ComponentesCombo
        ? String(p.ComponentesCombo).split(',').map(function(c) { return c.trim(); }).filter(Boolean)
        : [];
      return { clave: p.Clave, nombre: p.Nombre, precio: p.Precio, componentes: componentes, entregables: p.Entregables || '' };
    }).filter(Boolean);

    // Agregar combos que cubren subconjuntos de addonsOfrecidos.
    const todosPaquetes = obtenerPaquetesActivos1();
    todosPaquetes.forEach(function(p) {
      if (!p.ComponentesCombo) return;
      if (!p.EsAdicional) return;
      const componentes = String(p.ComponentesCombo).split(',').map(function(c) { return c.trim(); }).filter(Boolean);
      if (!componentes.length) return;
      // El combo ya esta en la lista: no duplicar.
      const yaIncludo = addonsDisponibles.some(function(a) { return a.clave === p.Clave; });
      if (yaIncludo) return;
      // El combo solo aparece si todos sus componentes estan en addonsOfrecidos.
      const todosDisponibles = componentes.every(function(c) { return setOfrecidos[c]; });
      if (!todosDisponibles) return;
      addonsDisponibles.push({ clave: p.Clave, nombre: p.Nombre, precio: p.Precio, componentes: componentes, entregables: p.Entregables || '' });
    });
  }

  const LOCACION_DISPLAY = {
    'safi metropolitan' : 'Valle Oriente, San Pedro Garza García',
    'rincon de santiago': 'Santiago, N.L.',
  };
  const locKey          = sinAcentos1(contrato.Locacion);
  const locacionDisplay = LOCACION_DISPLAY[locKey] || contrato.Locacion;

  return jsonResponse1({
    ok               : true,
    estatus          : contrato.Estatus,
    tipoContrato     : contrato.TipoContrato,
    folio            : contrato.Folio,
    nombre           : contrato.NombreCliente,
    correo           : contrato.CorreoCliente,
    telefono         : contrato.TelefonoCliente,
    paqueteNombre    : contrato.PaqueteNombre,
    locacion         : contrato.Locacion,
    locacionDisplay  : locacionDisplay,
    espacioLocacion  : contrato.EspacioLocacion,
    descripcion      : contrato.DescripcionServicio,
    fechaEvento      : contrato.FechaEvento,
    horaEvento       : contrato.HoraEvento,
    precio           : parseFloat(contrato.Precio) || 0,
    anticipo         : parseFloat(contrato.Anticipo) || 0,
    saldoPendiente   : parseFloat(contrato.SaldoPendiente) || 0,
    adicionales      : adicionales,
    addonsExtra      : addonsExtra,
    addonsDisponibles: addonsDisponibles,
    abonos           : abonos.map(function(a) {
      return { monto: a.Monto, metodo: a.Metodo, fecha: a.Fecha };
    }),
    totalAbonado     : totalAbonado,
    pdfContratoUrl   : contrato.PdfContratoUrl    || '',
    entregaDriveLink : contrato.EntregaDriveLink  || '',
    entregaLinksExtra: contrato.EntregaLinksExtra || '',
    entregaRevocada  : contrato.EntregaRevocada   || '',
    notasContrato    : contrato.NotasContrato     || '',
    waLink           : CONFIG1.WA_LINK,
    banco            : CONFIG1.BANCO,
    clabe            : CONFIG1.CLABE,
    cuenta           : CONFIG1.CUENTA,
    titular          : CONFIG1.TITULAR,
  });
}

// === Endpoint: manejarFirmaCliente ===

function accionManejarFirmaCliente1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });

  // El correo del cliente es obligatorio para enviarle el contrato firmado.
  const correoIn = String(body.correoCliente || '').trim();
  if (!correoIn || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoIn)) {
    return jsonResponse1({ error: 'Se requiere un correo electrónico válido para enviar el contrato firmado.' });
  }

  let anticipoFinal = 0;
  let contratoFinal = null;
  let firmaBase64   = '';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const tokenData = obtenerToken1(token);
    if (!tokenData) return jsonResponse1({ error: 'Enlace inválido' });

    const contrato = obtenerContrato1(tokenData.contratoID);
    if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

    // Guarda contra doble envío: solo se firma una vez. Previene el fallo 5.
    if (contrato.Estatus !== 'Pendiente firma') {
      return jsonResponse1({ error: 'Este contrato ya fue firmado' });
    }
    if (!estaTokenVigente1(tokenData)) {
      return jsonResponse1({ error: 'El enlace ha expirado. Solicita uno nuevo a Proposal Inc.' });
    }

    firmaBase64 = body.firmaBase64 || '';

    // Add-ons que Bruno ofreció a este cliente al crear el contrato.
    // Se lee AddonsOfrecidosJSON porque AdicionalesJSON se sobreescribe al firmar
    // con los add-ons aceptados, haciendo que una segunda firma usara datos incorrectos.
    let addonsOfrecidos = [];
    try { addonsOfrecidos = JSON.parse(contrato.AddonsOfrecidosJSON || '[]'); } catch (err) { addonsOfrecidos = []; }

    // Los contratos personalizados no tienen add-ons. En los estandar solo se
    // aceptan claves que Bruno ofreció O combos cuyos componentes esten todos
    // en addonsOfrecidos. Esto habilita los combos de descuento (BUG-005-008).
    const setOfrecidosFirma = {};
    addonsOfrecidos.forEach(function(c) { setOfrecidosFirma[c] = true; });
    const addonsAceptadosRaw = contrato.TipoContrato === 'personalizado'
      ? []
      : (Array.isArray(body.adicionales)
          ? body.adicionales.filter(function(c) {
              if (setOfrecidosFirma[c]) return true;
              // Aceptar combos derivados de los add-ons ofrecidos.
              const p = obtenerPaquete1ByClave(c);
              if (!p || !p.ComponentesCombo) return false;
              const comps = String(p.ComponentesCombo).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
              return comps.length > 0 && comps.every(function(comp) { return setOfrecidosFirma[comp]; });
            })
          : []);

    // Deduplicar: si un combo está seleccionado, excluir sus componentes individuales
    // para evitar doble conteo en caso de que el cliente enviara ambos.
    const componentesCubiertos = new Set();
    addonsAceptadosRaw.forEach(function(clave) {
      const p = obtenerPaquete1ByClave(clave);
      if (p && p.ComponentesCombo) {
        String(p.ComponentesCombo).split(',').map(function(s) { return s.trim(); }).filter(Boolean)
          .forEach(function(c) { componentesCubiertos.add(c); });
      }
    });
    const addonsAceptados = addonsAceptadosRaw.filter(function(clave) {
      return !componentesCubiertos.has(clave);
    });

    // El precio acordado por Bruno es la base. Previene el fallo 8: no se usa
    // el precio del catálogo, se usa contrato.Precio.
    const precioBase = parseFloat(contrato.Precio) || 0;
    let precioAddons = 0;
    addonsAceptados.forEach(function(clave) {
      const p = obtenerPaquete1ByClave(clave);
      if (p && p.EsAdicional) precioAddons += p.Precio;
    });
    const precioFinal = precioBase + precioAddons;

    // Si el cliente no agregó add-ons, se preserva el anticipo que puso Bruno.
    // Si sí agregó, se recalcula manteniendo la misma proporción del anticipo original
    // respecto al precio base, para no sobreescribir un anticipo personalizado.
    const ratioAnticipo = precioBase > 0
      ? Math.min(1, (parseFloat(contrato.Anticipo) || 0) / precioBase) : 0.5;
    anticipoFinal = precioAddons > 0
      ? Math.round(precioFinal * ratioAnticipo)
      : parseFloat(contrato.Anticipo) || 0;

    // I3: si el anticipo original ya cubria el precio base completo (ratio=1) y el
    // cliente agrego add-ons, no escalar el anticipo al nuevo precio total para que
    // exista saldo pendiente por los add-ons.
    if (precioAddons > 0 && anticipoFinal >= precioFinal) {
      anticipoFinal = parseFloat(contrato.Anticipo) || 0;
    }

    actualizarContrato1(tokenData.contratoID, {
      AdicionalesJSON    : JSON.stringify(addonsAceptados),
      Precio             : precioFinal,
      Anticipo           : anticipoFinal,
      SaldoPendiente     : precioFinal,
      Estatus            : anticipoFinal === 0 ? 'En produccion' : 'Firmado',
      FechaFirma         : new Date().toISOString(),
      NombrePareja       : String(body.nombrePareja  || '').trim(),
      CancionEvento      : String(body.cancionEvento || '').trim(),
      FamiliaAsiste      : (body.familiaAsiste === true || body.familiaAsiste === 'true') ? 'Sí' : 'No',
      FamiliaNumero      : parseInt(body.familiaNumero, 10) || 0,
      AlergiasAlimentarias: String(body.alergiasAlimentarias || '').trim(),
      OrigenCliente        : String(body.origenCliente || '').trim(),
    });

    // Actualizar correo y telefono solo si el cliente proporcionó valores.
    const correoNuevo   = String(body.correoCliente   || '').trim();
    const telefonoNuevo = String(body.telefonoCliente || '').trim();
    if (correoNuevo || telefonoNuevo) {
      const camposContacto = {};
      if (correoNuevo)   camposContacto.CorreoCliente   = correoNuevo;
      if (telefonoNuevo) camposContacto.TelefonoCliente = telefonoNuevo;
      actualizarContrato1(tokenData.contratoID, camposContacto);
    }

    // Guardar la firma dentro del lock: procesarPDFsPendientes1 corre cada minuto
    // y filtra por FechaFirma set + PdfContratoUrl vacío. Si la firma se subiera
    // después del lock, el trigger podría generar el PDF antes de que FirmaBase64URL
    // exista, produciendo un contrato firmado sin imagen de rúbrica.
    if (firmaBase64) {
      try {
        const base64Data     = firmaBase64.replace(/^data:image\/\w+;base64,/, '');
        const firmaBlob      = Utilities.newBlob(
          Utilities.base64Decode(base64Data), 'image/png', tokenData.contratoID + '_firma.png');
        const carpetaSistema = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
        const carpetaFirmas  = buscarOCrearCarpeta1('03. Firmas Pendientes', carpetaSistema);
        const firmaFile      = carpetaFirmas.createFile(firmaBlob);
        actualizarContrato1(tokenData.contratoID, { FirmaBase64URL: firmaFile.getId() });
      } catch (err) {
        Logger.log('Error guardando firma temporal: ' + err.message);
      }
    }

    volverTokenPermanente1(token);
    contratoFinal = obtenerContrato1(tokenData.contratoID);
  } finally {
    lock.releaseLock();
  }

  // C2: si Sheets devolvio null (error transitorio), no continuar con datos indefinidos.
  if (!contratoFinal) {
    Logger.log('manejarFirmaCliente: no se pudo releer el contrato tras la firma para token ' + token);
    return jsonResponse1({ error: 'La firma se procesó pero no se pudo confirmar el estado final. Recarga el portal.' });
  }

  // Contrato con anticipo cero: salta a En produccion sin pasar por confirmarReservacion.
  // Se crean aquí la carpeta de Drive y el evento de Calendar que normalmente generaría
  // ese endpoint, para que el contrato quede completo desde la firma.
  if (anticipoFinal === 0 && contratoFinal) {
    try {
      const carpetaId = crearCarpetaProyecto1(contratoFinal);
      if (carpetaId) {
        // C3: verificar el retorno para detectar fallo silencioso de Sheets.
        const guardadoOkCarpeta = actualizarContrato1(contratoFinal.Token, { CarpetaProyectoID: carpetaId });
        if (!guardadoOkCarpeta) Logger.log('manejarFirmaCliente: no se pudo persistir CarpetaProyectoID para ' + contratoFinal.Token);
        contratoFinal.CarpetaProyectoID = carpetaId;
      }
    } catch (err) {
      Logger.log('manejarFirmaCliente - carpeta (anticipo 0): ' + err.message);
    }
    try {
      crearEventoCalendario1(contratoFinal);
    } catch (err) {
      Logger.log('manejarFirmaCliente - calendario (anticipo 0): ' + err.message);
    }
  }

  try {
    enviarCorreo1(CONFIG1.EMAIL_ADMIN,
      'Contrato firmado — ' + contratoFinal.NombreCliente,
      correoContratoFirmadoAdmin1(contratoFinal), []);
  } catch (err) {
    Logger.log('Error notificando firma al admin: ' + err.message);
  }

  Logger.log('Firma procesada: ' + contratoFinal.NombreCliente + ' | folio: ' + contratoFinal.Folio);
  return jsonResponse1({
    ok      : true,
    folio   : contratoFinal.Folio,
    precio  : parseFloat(contratoFinal.Precio) || 0,
    anticipo: parseFloat(contratoFinal.Anticipo) || 0,
  });
}

// === Endpoint: registrarAbono ===

function accionRegistrarAbono1(body) {
  const token           = body.token  || '';
  const monto           = parseFloat(body.monto) || 0;
  const metodo          = body.metodo || 'Transferencia';
  const notas           = body.notas  || '';
  const permitirExceso  = body.permitirExceso === true;

  if (!token || monto <= 0) {
    return jsonResponse1({ error: 'Token y monto válido son obligatorios' });
  }

  let saldoNuevo   = 0;
  let estatusNuevo = '';
  let totalAbonado = 0;
  let precioFinal  = 0;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const contrato = obtenerContrato1(token);
    if (!contrato) {
      return jsonResponse1({ error: 'Contrato no encontrado' });
    }

    if (contrato.Estatus === 'Pendiente firma') {
      return jsonResponse1({ error: 'No se puede registrar un abono en un contrato sin firmar.' });
    }

    // Validar que el abono no exceda el saldo pendiente, salvo que se autorice subir el precio.
    const precioActual = parseFloat(contrato.Precio) || 0;
    const saldoActual  = parseFloat(contrato.SaldoPendiente) || 0;
    if (!permitirExceso && monto > saldoActual + 0.5) {
      return jsonResponse1({
        error               : 'El monto excede el saldo pendiente.',
        codigoError         : 'EXCEDE_SALDO',
        saldoActual         : saldoActual,
        precioActual        : precioActual,
        montoIntentado      : monto,
        nuevoPrecioPropuesto: precioActual + (monto - saldoActual),
      });
    }

    registrarAbonoFila1(token, monto, metodo, notas);

    const abonos = obtenerAbonos1(token);
    totalAbonado = abonos.reduce(function(s, a) { return s + (parseFloat(a.Monto) || 0); }, 0);
    // Si se permitió exceso, subir Precio para que totalAbonado nunca exceda al precio.
    precioFinal = permitirExceso && totalAbonado > precioActual ? totalAbonado : precioActual;
    saldoNuevo  = Math.max(0, precioFinal - totalAbonado);

    // No retroceder un estatus que ya avanzó por un abono parcial. Si el contrato
    // ya está en produccion o entregado, un pago completo no debe degradarlo a Liquidado.
    // Si el saldo llega a cero pero la reservacion aún no fue confirmada con el hotel
    // (Firmado o Anticipo recibido), el estatus avanza solo a Anticipo recibido para
    // que Bruno aún pueda usar "Confirmar reservacion" y que ésta cree la carpeta en
    // Drive, el evento en Calendar y envíe el correo al cliente.
    const ESTATUSES_AVANZADOS      = ['Reservado', 'En produccion', 'Entregado'];
    const ESTATUSES_POST_PRODUCCION = ['En produccion', 'Entregado'];
    const ESTATUSES_SIN_RESERVACION = ['Firmado', 'Anticipo recibido'];
    estatusNuevo = saldoNuevo === 0
      ? (ESTATUSES_POST_PRODUCCION.indexOf(contrato.Estatus) !== -1
          ? contrato.Estatus
          : (ESTATUSES_SIN_RESERVACION.indexOf(contrato.Estatus) !== -1
              ? 'Anticipo recibido'
              : 'Liquidado'))
      : (ESTATUSES_AVANZADOS.indexOf(contrato.Estatus) !== -1
          ? contrato.Estatus : 'Anticipo recibido');

    const cambiosContrato = {
      SaldoPendiente  : saldoNuevo,
      FechaUltimoAbono: new Date().toISOString(),
      Estatus         : estatusNuevo,
    };
    if (precioFinal !== precioActual) cambiosContrato.Precio = precioFinal;
    actualizarContrato1(token, cambiosContrato);
  } finally {
    lock.releaseLock();
  }

  const contratoFinal = obtenerContrato1(token);

  // I9: si Sheets devolvio null por error transitorio, retornar exito con los datos calculados.
  if (!contratoFinal) {
    Logger.log('registrarAbono: no se pudo releer el contrato tras el abono para token ' + token);
    return jsonResponse1({ ok: true, totalAbonado: totalAbonado, saldoPendiente: saldoNuevo, estatus: estatusNuevo });
  }

  // Recibo al cliente.
  if (contratoFinal.CorreoCliente && String(contratoFinal.CorreoCliente).trim()) {
    try {
      enviarCorreo1(contratoFinal.CorreoCliente,
        'Recibo de pago — Proposal Inc',
        correoReciboAbono1(contratoFinal, monto, saldoNuevo), []);
    } catch (err) {
      Logger.log('Error enviando recibo de abono al cliente: ' + err.message);
    }
  }


  Logger.log('Abono registrado: ' + contratoFinal.NombreCliente +
             ' | monto: ' + monto + ' | saldo: ' + saldoNuevo);
  return jsonResponse1({
    ok            : true,
    totalAbonado  : totalAbonado,
    saldoPendiente: saldoNuevo,
    estatus       : estatusNuevo,
  });
}

// Crea en Drive la carpeta del proyecto usando la jerarquía 01. Proyectos / [Año] / [MM. Mes].
function crearCarpetaProyecto1(contrato) {
  const d      = parseFecha1(contrato.FechaEvento) || new Date();
  const anio   = String(d.getFullYear());
  const meses  = ['01. Enero','02. Febrero','03. Marzo','04. Abril','05. Mayo',
                  '06. Junio','07. Julio','08. Agosto','09. Septiembre',
                  '10. Octubre','11. Noviembre','12. Diciembre'];
  const mes    = meses[d.getMonth()];
  const carpetaSistema   = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
  const carpetaRaiz      = buscarOCrearCarpeta1('01. Proyectos', carpetaSistema);
  const carpetaAnio      = buscarOCrearCarpeta1(anio,  carpetaRaiz);
  const carpetaMes       = buscarOCrearCarpeta1(mes,   carpetaAnio);
  const nombreCarpeta    = (contrato.Folio || contrato.Token) + ' — ' + contrato.NombreCliente;
  const carpetaProyecto  = buscarOCrearCarpeta1(nombreCarpeta, carpetaMes);
  buscarOCrearCarpeta1('Fotos', carpetaProyecto);
  buscarOCrearCarpeta1('Video', carpetaProyecto);
  Logger.log('Carpeta de proyecto creada: ' + nombreCarpeta);
  return carpetaProyecto.getId();
}

// === Endpoint: actualizarEstatus ===

function accionActualizarEstatus1(body) {
  const token   = body.token   || '';
  const estatus = body.estatus || '';
  if (!token || !estatus) return jsonResponse1({ error: 'Token y estatus son obligatorios' });
  if (ESTATUSES_VALIDOS1.indexOf(estatus) === -1) {
    return jsonResponse1({ error: 'Estatus no válido: ' + estatus });
  }
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  // Impedir retroceder el ciclo de estatus. Previene sobreescribir pagos ya registrados.
  const ORDEN_ESTATUS1 = [
    'Pendiente firma','Firmado','Anticipo recibido','Reservado',
    'Liquidado','En produccion','Entregado',
  ];
  const idxActual = ORDEN_ESTATUS1.indexOf(contrato.Estatus);
  const idxNuevo  = ORDEN_ESTATUS1.indexOf(estatus);
  if (idxActual !== -1 && idxNuevo < idxActual) {
    return jsonResponse1({ error: 'No se puede retrogradar el estatus de "' + contrato.Estatus + '" a "' + estatus + '".' });
  }

  actualizarContrato1(token, { Estatus: estatus });
  Logger.log('Estatus actualizado: ' + contrato.NombreCliente + ' a ' + estatus);

  if (estatus === 'En produccion') {
    crearEventoEntregaSiCorresponde1(token);
  }

  // C1: si Bruno mueve el estatus manualmente a Reservado, crear carpeta de Drive
  // y evento de Calendar si aun no existen, igual que hace confirmarReservacion.
  if (estatus === 'Reservado') {
    if (!String(contrato.CarpetaProyectoID || '').trim()) {
      try {
        const carpetaId = crearCarpetaProyecto1(contrato);
        if (carpetaId) {
          actualizarContrato1(token, { CarpetaProyectoID: carpetaId });
          contrato.CarpetaProyectoID = carpetaId;
        }
      } catch (err) {
        Logger.log('actualizarEstatus Reservado - carpeta: ' + err.message);
      }
    }
    if (!String(contrato.EventoCalendarioID || '').trim()) {
      try {
        crearEventoCalendario1(contrato);
      } catch (err) {
        Logger.log('actualizarEstatus Reservado - calendario: ' + err.message);
      }
    }
  }

  return jsonResponse1({ ok: true, estatus: estatus });
}

// === Endpoint: guardarEntrega ===

function accionGuardarEntrega1(body) {
  const token      = body.token      || '';
  const driveLink  = body.driveLink  || '';
  const linksExtra = body.linksExtra || '';
  if (!token || !driveLink) {
    return jsonResponse1({ error: 'Token y link de Drive son obligatorios' });
  }
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  // Entregado se incluye para permitir re-entrega después de revocarEntrega,
  // que no cambia el estatus, por lo que el contrato permanece en Entregado.
  const ESTADOS_ENTREGA = ['En produccion', 'Liquidado', 'Entregado'];
  if (ESTADOS_ENTREGA.indexOf(contrato.Estatus) === -1) {
    return jsonResponse1({ error: 'El contrato debe estar En produccion, Liquidado o Entregado para registrar la entrega.' });
  }

  const esPrimeraEntrega = !contrato.EntregaDriveLink ||
                           String(contrato.EntregaDriveLink).trim() === '';
  const nuevoEstatus = 'Entregado';

  actualizarContrato1(token, {
    EntregaDriveLink : driveLink,
    EntregaLinksExtra: linksExtra,
    FechaEntrega     : new Date().toISOString(),
    Estatus          : nuevoEstatus,
  });

  // El correo de entrega se envía solo la primera vez.
  if (esPrimeraEntrega) {
    try {
      enviarCorreo1(contrato.CorreoCliente,
        'Tu material está listo — Proposal Inc',
        correoEntregaCliente1(contrato, token), []);
    } catch (err) {
      Logger.log('Error enviando correo de entrega: ' + err.message);
    }
  }

  Logger.log('Entrega guardada: ' + contrato.NombreCliente);
  return jsonResponse1({ ok: true });
}

// === Endpoint: revocarEntrega ===

function accionRevocarEntrega1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  const revocar = !!body.revocar;
  actualizarContrato1(token, {
    EntregaRevocada: revocar ? new Date().toISOString() : '',
  });
  Logger.log('Entrega ' + (revocar ? 'revocada' : 'reactivada') + ': ' + contrato.NombreCliente);
  return jsonResponse1({ ok: true, revocada: revocar });
}

// === Endpoint: guardarProduccion ===

function accionGuardarProduccion1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  const ahora = new Date().toISOString();
  // Si la casilla viene marcada, se conserva el sello de tiempo previo cuando ya
  // existía; si no había, se pone el actual. Si viene desmarcada, se vacía.
  function sello(activo, valorPrevio) {
    if (!activo) return '';
    return (valorPrevio && String(valorPrevio).trim()) ? valorPrevio : ahora;
  }

  actualizarContrato1(token, {
    FotografiaLista: sello(!!body.fotografiaLista, contrato.FotografiaLista),
    VideoListo     : sello(!!body.videoListo,      contrato.VideoListo),
  });
  Logger.log('Producción guardada: ' + contrato.NombreCliente);
  return jsonResponse1({ ok: true });
}

// === Endpoint: marcarSesionCompletada ===

function accionMarcarSesionCompletada1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  if (['Firmado', 'Anticipo recibido', 'Reservado', 'Liquidado', 'En produccion'].indexOf(contrato.Estatus) === -1) {
    return jsonResponse1({ error: 'El contrato no está en un estatus válido para marcar la sesión' });
  }

  // Conserva el sello de tiempo previo si la sesión ya estaba marcada.
  const sello = (contrato.SesionCompletada && String(contrato.SesionCompletada).trim())
    ? contrato.SesionCompletada : new Date().toISOString();

  actualizarContrato1(token, {
    SesionCompletada: sello,
    Estatus         : 'En produccion',
  });

  // C2: si el contrato no pasó por confirmarReservacion (carpeta o evento ausentes),
  // crearlos ahora para que la edicion tenga Drive y Calendar disponibles.
  if (!String(contrato.CarpetaProyectoID || '').trim()) {
    try {
      const carpetaId = crearCarpetaProyecto1(contrato);
      if (carpetaId) {
        actualizarContrato1(token, { CarpetaProyectoID: carpetaId });
        contrato.CarpetaProyectoID = carpetaId;
      }
    } catch (err) {
      Logger.log('marcarSesionCompletada - carpeta: ' + err.message);
    }
  }
  if (!String(contrato.EventoCalendarioID || '').trim()) {
    try {
      crearEventoCalendario1(contrato);
    } catch (err) {
      Logger.log('marcarSesionCompletada - calendario: ' + err.message);
    }
  }

  crearEventoEntregaSiCorresponde1(token);
  Logger.log('Sesión completada: ' + contrato.NombreCliente);
  return jsonResponse1({ ok: true });
}

// === Endpoint: guardarNotasInternas ===

function accionGuardarNotasInternas1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  const notasNuevas = body.notas !== undefined ? String(body.notas) : '';
  const guardadoOk = actualizarContrato1(token, { NotasInternas: notasNuevas });
  if (!guardadoOk) return jsonResponse1({ error: 'No se pudo guardar: contrato no encontrado en el Sheets.' });

  // Re-leer el contrato fresco para que Calendar refleje el estado actual del Sheets,
  // incluyendo campos actualizados en otras operaciones (CarpetaProyectoID, etc.).
  const contratoFresh = obtenerContrato1(token);
  if (contratoFresh) actualizarDescripcionEventoCalendario1(contratoFresh);

  return jsonResponse1({ ok: true });
}

// === Endpoint: guardarGastosVariables ===

function accionGuardarGastosVariables1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  const monto = parseFloat(body.gastos);
  if (isNaN(monto) || monto < 0) {
    return jsonResponse1({ error: 'El monto de gastos variables debe ser un número mayor o igual a cero' });
  }
  actualizarContrato1(token, { GastosVariablesExtra: monto });
  return jsonResponse1({ ok: true });
}

// === Endpoint: enviarCorreoResena ===

function accionEnviarCorreoResena1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });
  if (contrato.EncuestaEnviada && String(contrato.EncuestaEnviada).trim()) {
    return jsonResponse1({ error: 'El correo de reseña ya fue enviado anteriormente' });
  }
  if (!contrato.CorreoCliente || !String(contrato.CorreoCliente).trim()) {
    return jsonResponse1({ error: 'El cliente no tiene correo registrado' });
  }
  try {
    enviarCorreo1(contrato.CorreoCliente,
      'Gracias por tu confianza — Proposal Inc',
      correoResena1(contrato), []);
    actualizarContrato1(token, { EncuestaEnviada: new Date().toISOString() });
    Logger.log('enviarCorreoResena: enviado a ' + contrato.NombreCliente);
    return jsonResponse1({ ok: true });
  } catch (err) {
    Logger.log('enviarCorreoResena: error para ' + token + ': ' + err.message);
    return jsonResponse1({ error: 'Error al enviar el correo: ' + err.message });
  }
}

// === Endpoint: enviarRecordatorioPago ===

function accionEnviarRecordatorioPago1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

  const saldo = parseFloat(contrato.SaldoPendiente) || 0;
  if (saldo <= 0) return jsonResponse1({ error: 'Este contrato no tiene saldo pendiente.' });

  const correo = String(contrato.CorreoCliente || '').trim();
  if (!correo) return jsonResponse1({ error: 'El cliente no tiene correo registrado.' });

  try {
    enviarCorreo1(correo,
      'Recordatorio de pago — ' + (contrato.Folio || 'Proposal Inc'),
      correoRecordatorioPago1(contrato), []);
    // I1: registrar la fecha del envio para trazabilidad y evitar duplicados en rafaga.
    asegurarColumnaContratos1('UltimoRecordatorioPagoEnviado');
    actualizarContrato1(token, { UltimoRecordatorioPagoEnviado: new Date().toISOString() });
    Logger.log('enviarRecordatorioPago: enviado a ' + contrato.NombreCliente);
    return jsonResponse1({ ok: true });
  } catch (err) {
    Logger.log('enviarRecordatorioPago: error para ' + token + ': ' + err.message);
    return jsonResponse1({ error: 'Error al enviar el correo: ' + err.message });
  }
}

// === Endpoint: agregarAddonPostFirma ===

function accionAgregarAddonPostFirma1(body) {
  const token = String(body.token || '').trim();
  if (!token) return jsonResponse1({ error: 'Token requerido' });

  const ESTATUSES_PERMITIDOS = ['Firmado','Anticipo recibido','Reservado','Liquidado','En produccion'];

  let nombreItem = '';
  let precioItem = 0;

  if (body.clave) {
    // Item del catálogo de add-ons.
    const paquete = obtenerPaquete1ByClave(String(body.clave).trim());
    if (!paquete || !paquete.EsAdicional) {
      return jsonResponse1({ error: 'Add-on no encontrado en el catálogo: ' + body.clave });
    }
    nombreItem = paquete.Nombre;
    precioItem = paquete.Precio;
  } else {
    nombreItem = String(body.nombre || '').trim();
    precioItem = parseFloat(body.precio) || 0;
    if (!nombreItem) return jsonResponse1({ error: 'El nombre del servicio es obligatorio.' });
    if (precioItem <= 0) return jsonResponse1({ error: 'El precio debe ser mayor a cero.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const contrato = obtenerContrato1(token);
    if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });
    if (ESTATUSES_PERMITIDOS.indexOf(contrato.Estatus) === -1) {
      return jsonResponse1({ error: 'Solo se pueden agregar servicios a contratos firmados y no entregados.' });
    }

    // Garantizar que la columna exista en la hoja antes de escribir.
    asegurarColumnaContratos1('AddonsExtraJSON');

    let extras = [];
    try { extras = JSON.parse(contrato.AddonsExtraJSON || '[]'); } catch (e) { extras = []; }
    if (!Array.isArray(extras)) extras = [];
    extras.push({ nombre: nombreItem, precio: precioItem });

    const precioNuevo = (parseFloat(contrato.Precio) || 0) + precioItem;
    const saldoNuevo  = (parseFloat(contrato.SaldoPendiente) || 0) + precioItem;

    actualizarContrato1(token, {
      AddonsExtraJSON: JSON.stringify(extras),
      Precio         : precioNuevo,
      SaldoPendiente : saldoNuevo,
    });
    Logger.log('Addon post-firma agregado: ' + nombreItem + ' (' + precioItem + ') a ' + contrato.NombreCliente);
    return jsonResponse1({ ok: true, nombre: nombreItem, precio: precioItem });
  } finally {
    lock.releaseLock();
  }
}

// === Endpoint: reagendarContrato (Plan 2) ===

function accionReagendarContrato1(body) {
  const token      = String(body.token      || '').trim();
  const nuevaFecha = String(body.nuevaFecha || '').trim();
  const nuevaHora  = String(body.nuevaHora  || '').trim();
  if (!token)      return jsonResponse1({ error: 'Token requerido' });
  if (!nuevaFecha) return jsonResponse1({ error: 'La nueva fecha es obligatoria' });
  if (!parseFecha1(nuevaFecha)) {
    return jsonResponse1({ error: 'Formato de fecha inválido (se esperaba YYYY-MM-DD)' });
  }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (parseFecha1(nuevaFecha) < hoy) {
    return jsonResponse1({ error: 'La nueva fecha no puede ser anterior a hoy.', codigoError: 'FECHA_PASADA' });
  }

  // Previene ejecuciones concurrentes que actualizarían Calendar y enviarían correo dos veces.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) {
    Logger.log('reagendarContrato: otra instancia en curso para token ' + token);
    return jsonResponse1({ error: 'Operación en curso, intenta nuevamente.' });
  }

  let fechaAnterior = '';
  let nombreCliente = '';
  try {
    const contrato = obtenerContrato1(token);
    if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

    // Solo se puede reagendar si el contrato está en un estatus con evento confirmado.
    const ESTATUSES_REAGENDABLES1 = ['Firmado','Anticipo recibido','Reservado','Liquidado','En produccion'];
    if (ESTATUSES_REAGENDABLES1.indexOf(contrato.Estatus) === -1) {
      return jsonResponse1({ error: 'No se puede reagendar un contrato en estatus "' + contrato.Estatus + '".' });
    }

    // Validar restricciones de locación con la nueva fecha.
    const diaEvento = parseFecha1(nuevaFecha);
    if (diaEvento) {
      const dia = diaEvento.getDay();
      if (dia === 6 &&
          sinAcentos1(contrato.Locacion || '').includes('rincon') &&
          sinAcentos1(contrato.EspacioLocacion || '').includes('isla')) {
        return jsonResponse1({ error: 'La Isla de Rincón de Santiago no está disponible los sábados.' });
      }
    }

    fechaAnterior = String(contrato.FechaEvento || '').trim();
    nombreCliente = String(contrato.NombreCliente || '');

    const cambios = {
      FechaEvento        : nuevaFecha,
      FechaReagendamiento: fechaAnterior,
    };
    if (nuevaHora) cambios.HoraEvento = nuevaHora;

    // Si hay un evento de Calendar guardado, actualizarlo.
    const eventoId = String(contrato.EventoCalendarioID || '').trim();
    if (eventoId) {
      try {
        const evento = CalendarApp.getEventById(eventoId);
        if (evento) {
          const partes = nuevaFecha.split('-');
          // Parsear hora con regex para evitar NaN cuando nuevaHora no tiene formato HH:MM.
          let horaH = evento.getStartTime().getHours();
          let horaM = evento.getStartTime().getMinutes();
          if (nuevaHora) {
            const matchHora = String(nuevaHora).match(/^(\d{1,2}):(\d{2})$/);
            if (matchHora) { horaH = parseInt(matchHora[1], 10); horaM = parseInt(matchHora[2], 10); }
          }
          const inicio = new Date(
            parseInt(partes[0]),
            parseInt(partes[1]) - 1,
            parseInt(partes[2]),
            horaH,
            horaM
          );
          const duracion = evento.getEndTime() - evento.getStartTime();
          evento.setTime(inicio, new Date(inicio.getTime() + duracion));
        }
      } catch (err) {
        Logger.log('reagendarContrato: error actualizando Calendar: ' + err.message);
      }
    }

    actualizarContrato1(token, cambios);
  } finally {
    lock.releaseLock();
  }

  // Notificar al cliente del cambio de fecha y hora. Se re-lee el contrato para usar
  // los datos ya guardados, no el objeto previo al lock.
  const contratoActualizado = obtenerContrato1(token);
  if (!contratoActualizado) {
    Logger.log('reagendarContrato: no se pudo releer el contrato para el correo, token ' + token);
  } else if (String(contratoActualizado.CorreoCliente || '').trim()) {
    try {
      enviarCorreo1(
        contratoActualizado.CorreoCliente,
        'Tu evento fue reagendado — Proposal Inc',
        correoReagendamiento1(contratoActualizado, fechaAnterior),
        []
      );
    } catch (err) {
      Logger.log('reagendarContrato: error enviando correo al cliente: ' + err.message);
    }
  }

  Logger.log('Contrato reagendado: ' + nombreCliente + ' de ' + fechaAnterior + ' a ' + nuevaFecha);
  return jsonResponse1({ ok: true, fechaAnterior: fechaAnterior });
}

// Construye el correo de reagendamiento que se envía al cliente.
function correoReagendamiento1(contrato, fechaAnterior) {
  // BUG-012: nombre completo en el saludo.
  const nombre1 = String(contrato.NombreCliente || '').trim() || 'cliente';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Hola, ' +
        htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px">' +
        'Tu evento fue reagendado. Estos son los datos actualizados:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        (fechaAnterior ? _filaCorreo1('Fecha anterior', formatFechaEspanol1(fechaAnterior)) : '') +
        _filaCorreo1('Nueva fecha', formatFechaEspanol1(contrato.FechaEvento)) +
        (contrato.HoraEvento
          ? _filaCorreo1('Hora', formatHoraCorreo1(contrato.HoraEvento)) : '') +
        _filaCorreo1('Locación', contrato.Locacion) +
        (contrato.EspacioLocacion && !sinAcentos1(contrato.Locacion || '').includes('safi')
          ? _filaCorreo1('Espacio', contrato.EspacioLocacion) : '') +
      '</table>' +
      '<p style="font-size:13px;color:#444;margin:0">' +
        'Cualquier duda, escríbenos por WhatsApp.</p>' +
      _botonCorreo1('ESCRIBIR POR WHATSAPP', CONFIG1.WA_LINK) +
    '</div>' + _pieCorreo1() + '</div>';
}

// === Endpoint: actualizarMeta (Plan 5) ===

function accionActualizarMeta1(body) {
  const meta = parseFloat(body.meta);
  if (!meta || meta <= 0) return jsonResponse1({ error: 'Valor de meta no válido.' });

  const ss = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
  const sh = ss.getSheetByName('Configuracion1');
  if (!sh) return jsonResponse1({ error: 'Hoja Configuracion1 no encontrada.' });
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const colIdx  = headers.indexOf('MetaMensual');
  if (colIdx === -1) return jsonResponse1({ error: 'Columna MetaMensual no encontrada.' });
  sh.getRange(2, colIdx + 1).setValue(meta);
  return jsonResponse1({ ok: true });
}

// === Endpoint: ocultarContrato (borrado suave) ===

function normalizarTokensMasivos1(tokens) {
  const origen = Array.isArray(tokens) ? tokens : String(tokens || '').split(',');
  const vistos = {};
  const salida = [];
  origen.forEach(function(token) {
    const limpio = String(token || '').trim();
    if (!limpio || vistos[limpio]) return;
    vistos[limpio] = true;
    salida.push(limpio);
  });
  return salida;
}

function ocultarContratoPorToken1(token) {
  const contrato = obtenerContrato1(token);
  if (!contrato) return { ok: false, token: token, error: 'Contrato no encontrado' };
  actualizarContrato1(token, { Oculto: true });
  Logger.log('Contrato archivado: ' + contrato.NombreCliente);
  return { ok: true, token: token, nombre: contrato.NombreCliente };
}

function accionOcultarContrato1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const resultado = ocultarContratoPorToken1(token);
  if (!resultado.ok) return jsonResponse1({ error: resultado.error });
  return jsonResponse1({ ok: true });
}

// === Endpoint: eliminarContrato (borrado permanente en cascada) ===

function eliminarContratoPorToken1(token) {
  const contrato = obtenerContrato1(token);
  if (!contrato) return { ok: false, token: token, error: 'Contrato no encontrado' };

  // Se borra de abajo hacia arriba para que deleteRow no desplace los índices.
  eliminarFilasPorColumna1(getContratosSheet1(), 'Token', token);
  eliminarFilasPorColumna1(getAbonosSheet1(),    'ContratoToken', token);
  eliminarFilasPorColumna1(getTokensSheet1(),    'Token', token);
  eliminarFilasPorColumna1(getTokensSheet1(),    'ContratoID', token);

  Logger.log('Contrato eliminado: ' + contrato.NombreCliente);
  return { ok: true, token: token, nombre: contrato.NombreCliente };
}

function accionEliminarContrato1(body) {
  const token = body.token || '';
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const resultado = eliminarContratoPorToken1(token);
  if (!resultado.ok) return jsonResponse1({ error: resultado.error });
  return jsonResponse1({ ok: true });
}

function accionOcultarContratosMasivo1(body) {
  const tokens = normalizarTokensMasivos1(body.tokens);
  if (!tokens.length) return jsonResponse1({ error: 'Selecciona al menos un contrato.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const resultados = tokens.map(function(token) { return ocultarContratoPorToken1(token); });
    const procesados = resultados.filter(function(r) { return r.ok; }).length;
    const errores    = resultados.filter(function(r) { return !r.ok; });
    return jsonResponse1({ ok: true, procesados: procesados, errores: errores });
  } finally {
    lock.releaseLock();
  }
}

function accionEliminarContratosMasivo1(body) {
  const tokens = normalizarTokensMasivos1(body.tokens);
  if (!tokens.length) return jsonResponse1({ error: 'Selecciona al menos un contrato.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const resultados = tokens.map(function(token) { return eliminarContratoPorToken1(token); });
    const procesados = resultados.filter(function(r) { return r.ok; }).length;
    const errores    = resultados.filter(function(r) { return !r.ok; });
    return jsonResponse1({ ok: true, procesados: procesados, errores: errores });
  } finally {
    lock.releaseLock();
  }
}

function eliminarFilasPorColumna1(hoja, columna, valor) {
  const datos = hoja.getDataRange().getValues();
  const col   = datos[0].indexOf(columna);
  if (col === -1) return;
  for (let i = datos.length - 1; i >= 1; i--) {
    if (String(datos[i][col]) === String(valor)) hoja.deleteRow(i + 1);
  }
}

// === Endpoint: listarPaquetes (público, solo activos) ===

function accionListarPaquetes1(e) {
  return jsonResponse1({ ok: true, paquetes: obtenerPaquetesActivos1() });
}

// === Endpoint: listarPaquetesAdmin (todos, activos e inactivos) ===

function accionListarPaquetesAdmin1(e) {
  const datos = getPaquetesSheet1().getDataRange().getValues();
  const enc   = datos[0];
  const todos = [];
  for (let i = 1; i < datos.length; i++) {
    if (!datos[i][0]) continue;
    const fila = {};
    enc.forEach(function(col, j) { fila[col] = datos[i][j]; });
    fila.Precio      = parseFloat(fila.Precio) || 0;
    fila.EsAdicional = esSi1(fila.EsAdicional);
    fila.Activo      = esSi1(fila.Activo);
    todos.push(fila);
  }
  todos.sort(function(a, b) { return (a.Orden || 0) - (b.Orden || 0); });
  return jsonResponse1({ ok: true, paquetes: todos });
}

// === Endpoint: crearPaquete ===

function accionCrearPaquete1(body) {
  const clave = String(body.clave || '').trim().toUpperCase();
  if (!clave) return jsonResponse1({ error: 'La clave es obligatoria' });

  const hoja  = getPaquetesSheet1();
  const datos = hoja.getDataRange().getValues();
  const enc   = datos[0];
  const colClave = enc.indexOf('Clave');
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colClave]).trim().toUpperCase() === clave) {
      return jsonResponse1({ error: 'Ya existe un paquete con esa clave' });
    }
  }

  const fila = enc.map(function(col) {
    switch (col) {
      case 'Clave':            return clave;
      case 'Locacion':         return String(body.locacion || 'Todas');
      case 'Nombre':           return String(body.nombre || '');
      case 'Precio':           return parseFloat(body.precio) || 0;
      case 'EsAdicional':      return body.esAdicional ? 'Si' : 'No';
      case 'Entregables':      return String(body.entregables || '');
      case 'Activo':           return body.activo === false ? 'No' : 'Si';
      case 'Orden':            return body.orden !== undefined ? parseInt(body.orden, 10) || 0 : 99;
      case 'ComponentesCombo': return String(body.componentesCombo || '');
      case 'CostoVariable':    return parseFloat(body.costoVariable) || 0;
      default:                 return '';
    }
  });
  hoja.appendRow(fila.map(function(v) {
    return typeof v === 'string' ? sanitizarParaSheets1(v) : v;
  }));
  Logger.log('Paquete creado: ' + clave);
  return jsonResponse1({ ok: true });
}

// === Endpoint: actualizarPaquete ===

function accionActualizarPaquete1(body) {
  const claveOriginal = String(body.claveOriginal || body.clave || '').trim().toUpperCase();
  if (!claveOriginal) return jsonResponse1({ error: 'La clave es obligatoria' });

  const hoja  = getPaquetesSheet1();
  const datos = hoja.getDataRange().getValues();
  const enc   = datos[0];
  const colClave = enc.indexOf('Clave');

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colClave]).trim().toUpperCase() === claveOriginal) {
      const fila = i + 1;
      enc.forEach(function(col, j) {
        let valor;
        switch (col) {
          case 'Clave':       valor = String(body.clave || claveOriginal).trim().toUpperCase(); break;
          case 'Locacion':    valor = body.locacion    !== undefined ? String(body.locacion) : datos[i][j]; break;
          case 'Nombre':      valor = body.nombre      !== undefined ? String(body.nombre) : datos[i][j]; break;
          case 'Precio':      valor = body.precio      !== undefined ? (parseFloat(body.precio) || 0) : datos[i][j]; break;
          case 'EsAdicional':      valor = body.esAdicional      !== undefined ? (body.esAdicional ? 'Si' : 'No') : datos[i][j]; break;
          case 'Entregables':      valor = body.entregables      !== undefined ? String(body.entregables) : datos[i][j]; break;
          case 'Activo':           valor = body.activo           !== undefined ? (body.activo ? 'Si' : 'No') : datos[i][j]; break;
          case 'ComponentesCombo': valor = body.componentesCombo !== undefined ? String(body.componentesCombo) : datos[i][j]; break;
          case 'CostoVariable':    valor = body.costoVariable    !== undefined ? (parseFloat(body.costoVariable) || 0) : datos[i][j]; break;
          case 'Orden':       valor = body.orden       !== undefined ? (parseInt(body.orden, 10) || 0) : datos[i][j]; break;
          default:            return;
        }
        hoja.getRange(fila, j + 1).setValue(typeof valor === 'string' ? sanitizarParaSheets1(valor) : valor);
      });
      Logger.log('Paquete actualizado: ' + claveOriginal);
      return jsonResponse1({ ok: true });
    }
  }
  return jsonResponse1({ error: 'Paquete no encontrado: ' + claveOriginal });
}

// === Endpoint: togglePaquete ===

function accionTogglePaquete1(body) {
  const clave  = String(body.clave || '').trim().toUpperCase();
  if (!clave) return jsonResponse1({ error: 'La clave es obligatoria' });
  const activo = body.activo !== false;

  const hoja  = getPaquetesSheet1();
  const datos = hoja.getDataRange().getValues();
  const enc   = datos[0];
  const colClave  = enc.indexOf('Clave');
  const colActivo = enc.indexOf('Activo');

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colClave]).trim().toUpperCase() === clave) {
      hoja.getRange(i + 1, colActivo + 1).setValue(activo ? 'Si' : 'No');
      return jsonResponse1({ ok: true, activo: activo });
    }
  }
  return jsonResponse1({ error: 'Paquete no encontrado: ' + clave });
}

// === Endpoint: actualizarEspacio ===
// Permite a Bruno confirmar el espacio de la locación después de que el
// establecimiento reserva la fecha. Solo accesible con adminKey.

function accionActualizarEspacio1(body) {
  const token  = body.token  || '';
  const espacio = String(body.espacio || '').trim();
  if (!token) return jsonResponse1({ error: 'Token requerido' });
  const contrato = obtenerContrato1(token);
  if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });
  const ESTADOS_BLOQUEADOS_ESPACIO = ['Liquidado', 'Entregado'];
  if (ESTADOS_BLOQUEADOS_ESPACIO.indexOf(contrato.Estatus) !== -1) {
    return jsonResponse1({ error: 'No se puede actualizar el espacio en un contrato ' + contrato.Estatus + '.' });
  }
  actualizarContrato1(token, { EspacioLocacion: espacio });
  Logger.log('EspacioLocacion actualizado para ' + contrato.NombreCliente + ': ' + espacio);
  return jsonResponse1({ ok: true });
}

// === Endpoint: listarClientes (CRM) ===

function accionListarClientes1(e) {
  const contratos = leerContratos1();
  const mapa = {};
  contratos.forEach(function(c) {
    if (esSi1(c.Oculto)) return;
    const key = String(c.CorreoCliente || c.TelefonoCliente || c.NombreCliente)
      .toLowerCase().trim();
    if (!key) return;
    if (!mapa[key]) {
      mapa[key] = {
        nombre  : c.NombreCliente,
        correo  : c.CorreoCliente,
        telefono: c.TelefonoCliente,
        eventos : [],
      };
    }
    mapa[key].eventos.push({
      token      : c.Token,
      folio      : c.Folio,
      estatus    : c.Estatus,
      precio     : c.Precio,
      fechaEvento: c.FechaEvento,
    });
  });
  const clientes = Object.keys(mapa).map(function(k) { return mapa[k]; });
  clientes.sort(function(a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  });
  return jsonResponse1({ ok: true, clientes: clientes });
}

// === Endpoint: exportarCSV ===

function accionExportarCSV1(e) {
  const contratos = leerContratos1();
  const cols = ['Folio','TipoContrato','NombreCliente','CorreoCliente','TelefonoCliente',
                'PaqueteNombre','Locacion','EspacioLocacion','Estatus','Precio',
                'Anticipo','SaldoPendiente','FechaCreacion','FechaEvento','HoraEvento'];
  const filas = [cols.join(',')];
  contratos.forEach(function(c) {
    if (esSi1(c.Oculto)) return;
    filas.push(cols.map(function(col) {
      let v = c[col];
      if (v instanceof Date) v = Utilities.formatDate(v, 'America/Monterrey', 'yyyy-MM-dd');
      return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    }).join(','));
  });
  return jsonResponse1({ ok: true, csv: filas.join('\n'), total: filas.length - 1 });
}

// === Endpoint: listarReportes (Plan 1 Task 9) ===

function accionListarReportes1(e) {
  const contratos  = leerContratos1().filter(function(c) { return !esSi1(c.Oculto); });
  const paquetes   = obtenerPaquetesActivos1();
  const paqueteMap = {};
  paquetes.forEach(function(p) { paqueteMap[p.Clave] = p.Nombre; });

  const ahora       = new Date();
  const hace12Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);
  const hace6Meses  = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);

  // Paquetes más vendidos (contratos firmados, últimos 12 meses).
  const contPaquetes = {};
  contratos.forEach(function(c) {
    if (c.Estatus === 'Pendiente firma') return;
    if (!c.FechaFirma || !String(c.FechaFirma).trim()) return;
    const f = parseFecha1(c.FechaFirma);
    if (!f || f < hace12Meses) return;
    const clave = String(c.PaqueteClave || '').trim();
    if (!clave || clave === 'Personalizado') return;
    contPaquetes[clave] = (contPaquetes[clave] || 0) + 1;
  });
  const paquetesMasVendidos = Object.keys(contPaquetes)
    .map(function(clave) {
      return { clave: clave, nombre: paqueteMap[clave] || clave, total: contPaquetes[clave] };
    })
    .sort(function(a, b) { return b.total - a.total; });

  // Add-ons más aceptados (últimos 12 meses).
  const contAddons = {};
  contratos.forEach(function(c) {
    if (c.Estatus === 'Pendiente firma') return;
    if (!c.FechaFirma || !String(c.FechaFirma).trim()) return;
    const f = parseFecha1(c.FechaFirma);
    if (!f || f < hace12Meses) return;
    let addons = [];
    try { addons = JSON.parse(c.AdicionalesJSON || '[]'); } catch (err) { addons = []; }
    addons.forEach(function(clave) {
      contAddons[clave] = (contAddons[clave] || 0) + 1;
    });
  });
  const addonsMasAceptados = Object.keys(contAddons)
    .map(function(clave) {
      return { clave: clave, nombre: paqueteMap[clave] || clave, total: contAddons[clave] };
    })
    .sort(function(a, b) { return b.total - a.total; });

  // Tasa de cierre por mes (últimos 6 meses).
  const etiquetasMes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const meses = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - m, 1);
    meses.push({
      label   : etiquetasMes[d.getMonth()] + ' ' + d.getFullYear(),
      key     : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      creados : 0,
      firmados: 0,
    });
  }
  contratos.forEach(function(c) {
    const fc = parseFecha1(c.FechaCreacion);
    if (!fc || fc < hace6Meses) return;
    const key  = fc.getFullYear() + '-' + String(fc.getMonth() + 1).padStart(2, '0');
    const slot = meses.filter(function(m) { return m.key === key; })[0];
    if (!slot) return;
    slot.creados++;
    if (c.Estatus !== 'Pendiente firma' && c.FechaFirma && String(c.FechaFirma).trim()) {
      slot.firmados++;
    }
  });
  const tasaCierre = meses.map(function(m) {
    return {
      label   : m.label,
      creados : m.creados,
      firmados: m.firmados,
      tasa    : m.creados > 0 ? Math.round(m.firmados / m.creados * 100) : 0,
    };
  });

  return jsonResponse1({
    ok                 : true,
    paquetesMasVendidos: paquetesMasVendidos,
    addonsMasAceptados : addonsMasAceptados,
    tasaCierre         : tasaCierre,
  });
}

// === Endpoint: obtenerPanelFinanciero (Plan 5) ===

function accionObtenerPanelFinanciero1(e) {
  const ss = SpreadsheetApp.openById(CONFIG1.SHEET_ID);

  // Meta mensual desde Configuracion1.
  const shConf = ss.getSheetByName('Configuracion1');
  if (!shConf) return jsonResponse1({ error: 'Hoja Configuracion1 no encontrada.' });
  const filaConf    = shConf.getRange(2, 1, 1, COLS_CONFIGURACION1.length).getValues()[0];
  const metaMensual = parseFloat(filaConf[COLS_CONFIGURACION1.indexOf('MetaMensual')] || 0);

  // Leer todos los contratos, indexados por Token.
  const shContratos = ss.getSheetByName('Contratos1');
  if (!shContratos) return jsonResponse1({ error: 'Hoja Contratos1 no encontrada.' });
  const datosContratos   = shContratos.getDataRange().getValues();
  const headersContratos = datosContratos[0];
  const idxTok     = headersContratos.indexOf('Token');
  const idxPrecio  = headersContratos.indexOf('Precio');
  const idxGastos  = headersContratos.indexOf('GastosVariablesExtra');
  const idxClave   = headersContratos.indexOf('PaqueteClave');
  const idxEstatus = headersContratos.indexOf('Estatus');
  const idxFirma   = headersContratos.indexOf('FechaFirma');

  const contratosPorToken = {};
  for (let i = 1; i < datosContratos.length; i++) {
    const fila = datosContratos[i];
    const tok  = String(fila[idxTok] || '');
    if (!tok) continue;
    contratosPorToken[tok] = {
      precio         : parseFloat(fila[idxPrecio]  || 0),
      gastosVariables: parseFloat(fila[idxGastos]  || 0),
      paqueteClave   : String(fila[idxClave]        || ''),
      estatus        : String(fila[idxEstatus]      || ''),
      fechaFirma     : fila[idxFirma],
    };
  }

  // Ganancia del mes: para cada abono recibido este mes, calcular la fraccion
  // de ganancia que representa ese pago respecto al contrato completo.
  const shAbonos = ss.getSheetByName('Abonos1');
  if (!shAbonos) return jsonResponse1({ error: 'Hoja Abonos1 no encontrada.' });
  const datosAbonos   = shAbonos.getDataRange().getValues();
  const headersAbonos = datosAbonos[0];
  // Abonos1 puede tener la fecha en 'FechaRegistro' o 'Fecha' dependiendo del setup.
  const idxFechaAbono = headersAbonos.indexOf('FechaRegistro') !== -1
    ? headersAbonos.indexOf('FechaRegistro')
    : headersAbonos.indexOf('Fecha');
  const idxMontoAbono    = headersAbonos.indexOf('Monto');
  const idxContratoToken = headersAbonos.indexOf('ContratoToken');

  const hoy        = new Date();
  const mesActual  = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  let gananciaMes  = 0;

  for (let i = 1; i < datosAbonos.length; i++) {
    const fila     = datosAbonos[i];
    const fechaVal = fila[idxFechaAbono];
    if (!fechaVal) continue;
    const fecha = new Date(fechaVal);
    if (fecha.getMonth() !== mesActual || fecha.getFullYear() !== anioActual) continue;

    const montoAbono = parseFloat(fila[idxMontoAbono] || 0);
    if (montoAbono <= 0) continue;

    const tok      = String(fila[idxContratoToken] || '');
    const contrato = contratosPorToken[tok];
    if (!contrato || contrato.precio <= 0) continue;

    const paquete      = contrato.paqueteClave ? obtenerPaquete1ByClave(contrato.paqueteClave) : null;
    const costoVariable = paquete ? (parseFloat(paquete.CostoVariable) || 0) : 0;
    const gananciaTotalContrato = contrato.precio - costoVariable - contrato.gastosVariables;

    gananciaMes += gananciaTotalContrato * (montoAbono / contrato.precio);
  }

  // Ganancia promedio por evento de los ultimos 6 meses (contratos firmados).
  const hace6Meses       = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
  const gananciasHistoricas = [];
  for (const tok in contratosPorToken) {
    const c = contratosPorToken[tok];
    if (c.estatus === 'Pendiente firma') continue;
    if (!c.fechaFirma) continue;
    if (new Date(c.fechaFirma) < hace6Meses) continue;
    if (c.precio <= 0) continue;
    const paquete       = c.paqueteClave ? obtenerPaquete1ByClave(c.paqueteClave) : null;
    const costoVariable = paquete ? (parseFloat(paquete.CostoVariable) || 0) : 0;
    gananciasHistoricas.push(c.precio - costoVariable - c.gastosVariables);
  }

  let ticketPromedio    = null;
  let eventosNecesarios = null;
  if (gananciasHistoricas.length > 0) {
    ticketPromedio = Math.round(
      gananciasHistoricas.reduce(function(a, b) { return a + b; }, 0) / gananciasHistoricas.length
    );
    const faltante = metaMensual - gananciaMes;
    eventosNecesarios = faltante <= 0 ? 0 : Math.ceil(faltante / ticketPromedio);
  }

  return jsonResponse1({
    ok               : true,
    ganancia_mes     : Math.round(gananciaMes),
    meta_mensual     : metaMensual,
    ticket_promedio  : ticketPromedio,
    eventos_necesarios: eventosNecesarios,
  });
}

// === Endpoint: listarStats ===

function accionListarStats1(e) {
  const periodo = (e.parameter.periodo || 'mes').toLowerCase();
  const ahora   = new Date();
  const anio    = ahora.getFullYear();
  const mes     = ahora.getMonth();

  function enPeriodo(fecha) {
    const d = parseFecha1(fecha);
    if (!d) return false;
    if (periodo === 'mes')       return d.getFullYear() === anio && d.getMonth() === mes;
    if (periodo === 'trimestre') {
      return d.getFullYear() === anio && Math.floor(d.getMonth() / 3) === Math.floor(mes / 3);
    }
    if (periodo === 'anio')      return d.getFullYear() === anio;
    return true; // 'todo'
  }

  const contratos = leerContratos1().filter(function(c) { return !esSi1(c.Oculto); });

  // Abonos.
  const datosA = getAbonosSheet1().getDataRange().getValues();
  const encA   = datosA[0];
  const abonos = [];
  for (let i = 1; i < datosA.length; i++) {
    if (!datosA[i][encA.indexOf('ContratoToken')]) continue;
    const obj = {};
    encA.forEach(function(col, j) { obj[col] = datosA[i][j]; });
    abonos.push(obj);
  }

  const ESTATUSES_ACTIVOS = ['Pendiente firma','Firmado','Anticipo recibido','Reservado','En produccion','Entregado'];
  let facturado = 0, numContratos = 0;
  const porEstatus = {};
  const porCliente = {};

  contratos.forEach(function(c) {
    if (!enPeriodo(c.FechaCreacion)) return;
    numContratos++;
    const precio = parseFloat(c.Precio) || 0;
    facturado += precio;
    const est = c.Estatus || 'Sin estatus';
    porEstatus[est] = (porEstatus[est] || 0) + 1;
    const cliente = String(c.NombreCliente || '').trim();
    if (cliente) porCliente[cliente] = (porCliente[cliente] || 0) + precio;
  });

  let cobrado = 0;
  abonos.forEach(function(a) {
    if (enPeriodo(a.Fecha || a.FechaRegistro)) cobrado += parseFloat(a.Monto) || 0;
  });

  const porCobrar = contratos
    .filter(function(c) { return ESTATUSES_ACTIVOS.indexOf(c.Estatus) !== -1; })
    .reduce(function(s, c) { return s + (parseFloat(c.SaldoPendiente) || 0); }, 0);

  const ticketPromedio = numContratos > 0 ? Math.round(facturado / numContratos) : 0;

  const topClientes = Object.keys(porCliente)
    .map(function(n) { return { nombre: n, total: porCliente[n] }; })
    .sort(function(a, b) { return b.total - a.total; })
    .slice(0, 5);

  const tiempoEntrega = calcularTiempoEntregaStats1(contratos, enPeriodo);

  // Facturación y cobranza de los últimos 6 meses.
  const mesesLabel = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const porMes = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(anio, mes - m, 1);
    porMes.push({
      mes: mesesLabel[d.getMonth()], anio: d.getFullYear(),
      key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      facturado: 0, cobrado: 0,
    });
  }
  function slotDe(fecha) {
    const d = parseFecha1(fecha);
    if (!d) return null;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return porMes.filter(function(p) { return p.key === key; })[0] || null;
  }
  contratos.forEach(function(c) {
    const slot = slotDe(c.FechaCreacion);
    if (slot) slot.facturado += parseFloat(c.Precio) || 0;
  });
  abonos.forEach(function(a) {
    const slot = slotDe(a.Fecha || a.FechaRegistro);
    if (slot) slot.cobrado += parseFloat(a.Monto) || 0;
  });

  return jsonResponse1({
    ok: true, periodo: periodo, facturado: facturado, cobrado: cobrado,
    porCobrar: porCobrar, numContratos: numContratos, ticketPromedio: ticketPromedio,
    porEstatus: porEstatus, topClientes: topClientes, porMes: porMes,
    tiempoEntrega: tiempoEntrega,
  });
}

// === Generación del PDF del contrato ===

// Reemplaza el marcador {{firma}} con la imagen de la firma del cliente.
function embebeFirmaEnDoc1(body, firmaBase64) {
  try {
    const base64Data = firmaBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgBlob    = Utilities.newBlob(
      Utilities.base64Decode(base64Data), 'image/png', 'firma.png');
    const found = body.findText('\\{\\{firma\\}\\}');
    if (!found) return;
    const para = found.getElement().getParent();
    const idx  = body.getChildIndex(para);
    body.replaceText('\\{\\{firma\\}\\}', '');
    body.insertImage(idx, imgBlob).setWidth(200).setHeight(75);
  } catch (err) {
    Logger.log('embebeFirmaEnDoc1: ' + err.message);
  }
}

function generarPDFContrato1(contrato, firmaBase64) {
  const carpetaSistema = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
  const carpetaTemp    = buscarOCrearCarpeta1('04. Temporal', carpetaSistema);
  const template       = DriveApp.getFileById(CONFIG1.TEMPLATE_CONTRATO_ID);
  const copia          = template.makeCopy('CONTRATO_TEMP_' + contrato.NombreCliente, carpetaTemp);

  try {
    const doc  = DocumentApp.openById(copia.getId());
    const body = doc.getBody();

    const precio   = parseFloat(contrato.Precio)   || 0;
    const anticipo = parseFloat(contrato.Anticipo) || 0;
    const restante = Math.max(0, precio - anticipo);

    // La dirección completa sale del catálogo; si no, se usa lo que capturó Bruno.
    const direccion = DIRECCIONES_LOCACION1[contrato.Locacion] || contrato.Locacion || '';

    // La descripción incluye los add-ons aceptados, si los hay.
    let descripcion = String(contrato.DescripcionServicio || '');
    try {
      const claves = JSON.parse(contrato.AdicionalesJSON || '[]');
      if (claves.length) {
        const nombres = claves.map(function(cl) {
          const p = obtenerPaquete1ByClave(cl);
          return p ? p.Nombre : cl;
        });
        descripcion += '. Servicios adicionales: ' + nombres.join(', ') + '.';
      }
    } catch (err) { /* sin add-ons */ }

    body.replaceText('\\{\\{folio\\}\\}',         String(contrato.Folio || ''));
    // La fecha del contrato es la fecha en que el cliente firmó, no la fecha
    // en que el trigger generó el PDF, que puede correr minutos u horas después.
    body.replaceText('\\{\\{fechaContrato\\}\\}',
      Utilities.formatDate(parseFecha1(contrato.FechaFirma) || new Date(),
        'America/Monterrey', 'dd/MM/yyyy'));
    body.replaceText('\\{\\{nombre1\\}\\}',       String(contrato.NombreCliente   || ''));
    body.replaceText('\\{\\{correoCliente\\}\\}', String(contrato.CorreoCliente   || ''));
    body.replaceText('\\{\\{telefono\\}\\}',      String(contrato.TelefonoCliente || ''));
    body.replaceText('\\{\\{fechaEvento\\}\\}',   formatFechaEspanol1(contrato.FechaEvento));
    // BUG-004: HoraEvento puede llegar como Date de 1899 desde Sheets; formatHoraCorreo1 lo normaliza.
    body.replaceText('\\{\\{horario\\}\\}',       formatHoraCorreo1(contrato.HoraEvento || ''));
    body.replaceText('\\{\\{locacion\\}\\}',      String(contrato.Locacion || ''));
    body.replaceText('\\{\\{locacion2\\}\\}',     String(direccion));
    body.replaceText('\\{\\{espacio\\}\\}',       String(contrato.EspacioLocacion || ''));
    body.replaceText('\\{\\{descripcion\\}\\}',   descripcion);
    body.replaceText('\\{\\{precio\\}\\}',        formatMXN1(precio));
    body.replaceText('\\{\\{anticipo\\}\\}',      formatMXN1(anticipo));
    body.replaceText('\\{\\{restante\\}\\}',      formatMXN1(restante));

    if (firmaBase64) {
      embebeFirmaEnDoc1(body, firmaBase64);
    } else {
      body.replaceText('\\{\\{firma\\}\\}', '');
    }

    doc.saveAndClose();

    return DriveApp.getFileById(copia.getId())
      .getAs('application/pdf')
      .setName('Contrato — ' + contrato.NombreCliente + '.pdf');
  } finally {
    try { copia.setTrashed(true); } catch (err) { /* ignorar */ }
  }
}

// Crea el evento de entrega en Calendar si el contrato pasó a En produccion y aún
// no tiene EventoEntregaCalendarioID. Se llama desde actualizarEstatus y desde
// marcarSesionCompletada para que ambos caminos generen el recordatorio.
function crearEventoEntregaSiCorresponde1(token) {
  try {
    const c = obtenerContrato1(token);
    if (!c || c.EventoEntregaCalendarioID) return;
    const adicionalesJson = c.AdicionalesJSON || '[]';
    let tieneExpress = false;
    try {
      const arr = JSON.parse(adicionalesJson);
      tieneExpress = arr.some(function(a) {
        return (typeof a === 'string' ? a : (a.clave || '')) === 'ADD-EXPRESS';
      });
    } catch (e) {}
    const fechaBase = parseFecha1(c.FechaEvento);
    if (!fechaBase) throw new Error('FechaEvento inválida: ' + c.FechaEvento);
    const diasEntrega  = tieneExpress ? 1 : 21;
    const fechaEntrega = new Date(fechaBase.getTime() + diasEntrega * 24 * 60 * 60 * 1000);
    const tituloEntrega = 'Entrega — ' + c.Folio + ' — ' + c.NombreCliente;
    const descEntrega = [
      'Paquete: ' + (c.PaqueteClave || ''),
      formatearAdicionalesTexto(adicionalesJson),
      'Portal: ' + CONFIG1.BASE_URL_PORTAL + '?token=' + token,
    ].filter(Boolean).join('\n');
    const evento = CalendarApp.getDefaultCalendar().createAllDayEvent(
      tituloEntrega, fechaEntrega, { description: descEntrega }
    );
    actualizarContrato1(token, { EventoEntregaCalendarioID: evento.getId() });
    Logger.log('crearEventoEntregaSiCorresponde1: evento creado para ' + c.Folio);
  } catch (err) {
    Logger.log('crearEventoEntregaSiCorresponde1: ' + err.message);
  }
}

// === Trigger: procesarPDFsPendientes ===
// Cada minuto. Genera el PDF de los contratos firmados que aún no lo tienen.

function procesarPDFsPendientes1() {
  // Previene ejecuciones concurrentes: si otra instancia del trigger ya corre,
  // esta se omite para evitar PDFs duplicados y doble correo al cliente.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) {
    Logger.log('procesarPDFsPendientes1: otra instancia en curso, se omite esta ejecucion');
    return;
  }
  try {
    const contratos = leerContratos1().filter(function(c) {
      return c.FechaFirma && String(c.FechaFirma).trim() &&
             (!c.PdfContratoUrl || String(c.PdfContratoUrl).trim() === '');
    });
    if (!contratos.length) return;

    const inicio = Date.now();
    const MAX_MS = 4 * 60 * 1000; // 4 minutos, margen ante el límite de Apps Script

    for (let i = 0; i < contratos.length; i++) {
      if (Date.now() - inicio > MAX_MS) {
        Logger.log('procesarPDFsPendientes1: límite de tiempo, quedan pendientes');
        break;
      }
      const contrato = contratos[i];
      try {
        // Recuperar la firma desde Drive con el ID guardado en FirmaBase64URL.
        let firmaBase64 = '';
        const firmaFileId = String(contrato.FirmaBase64URL || '').trim();
        if (firmaFileId) {
          try {
            firmaBase64 = 'data:image/png;base64,' +
              Utilities.base64Encode(DriveApp.getFileById(firmaFileId).getBlob().getBytes());
          } catch (err) {
            Logger.log('procesarPDFsPendientes1: firma no disponible para ' + contrato.Token);
          }
        }

        let pdfBlob;
        try {
          pdfBlob = generarPDFContrato1(contrato, firmaBase64);
        } catch (err) {
          Logger.log('procesarPDFsPendientes1: error generando PDF de ' + contrato.Token + ': ' + err.message);
          continue; // se reintenta en la siguiente ejecución
        }

        const carpetaSistema   = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
        const carpetaContratos = buscarOCrearCarpeta1('02. Contratos Firmados', carpetaSistema);
        const archivo = carpetaContratos.createFile(
          pdfBlob.setName((contrato.Folio || contrato.NombreCliente) + ' - Contrato.pdf'));
        archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        // Se guarda la URL antes de enviar el correo: si el correo falla, el PDF
        // ya está disponible y no se vuelve a generar en el siguiente ciclo.
        actualizarContrato1(contrato.Token, { PdfContratoUrl: archivo.getDownloadUrl() });

        try {
          enviarCorreo1(contrato.CorreoCliente,
            'Tu contrato firmado — Proposal Inc',
            correoContratoPDF1(contrato, contrato.Token), [pdfBlob]);
        } catch (errCorreo) {
          Logger.log('procesarPDFsPendientes1: PDF generado pero correo fallido para ' + contrato.Token + ': ' + errCorreo.message);
          try {
            GmailApp.sendEmail(
              CONFIG1.EMAIL_ADMIN,
              '[Proposal Inc] Correo de contrato no enviado — ' + contrato.Folio,
              'El PDF del contrato ' + contrato.Folio + ' se generó correctamente pero el correo al cliente falló.\n\nToken: ' + contrato.Token + '\nError: ' + errCorreo.message
            );
          } catch (e) { Logger.log('procesarPDFsPendientes1: no se pudo enviar alerta al admin: ' + e); }
        }

        // Eliminar la firma temporal de Drive.
        if (firmaFileId) {
          try {
            DriveApp.getFileById(firmaFileId).setTrashed(true);
            actualizarContrato1(contrato.Token, { FirmaBase64URL: '' });
          } catch (err) { /* ignorar */ }
        }

        Logger.log('procesarPDFsPendientes1: PDF generado para ' + contrato.Folio);
      } catch (err) {
        Logger.log('procesarPDFsPendientes1: error inesperado para ' + contrato.Token + ': ' + err.message);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

// === Trigger: recordatorio24h ===
// Cada hora. Avisa al cliente cuando su evento es al día siguiente.

// Devuelve texto legible de los add-ons de un contrato a partir de su JSON.
function formatearAdicionalesTexto(adicionalesJson) {
  if (!adicionalesJson) return '';
  try {
    const arr = JSON.parse(adicionalesJson);
    if (!arr || arr.length === 0) return '';
    return '\nAdd-ons: ' + arr.map(function(a) {
      const clave = typeof a === 'string' ? a : (a.clave || String(a));
      const p = obtenerPaquete1ByClave(clave);
      return p ? p.Nombre : clave;
    }).join(', ');
  } catch (e) {
    return '';
  }
}

// Calcula días enteros hasta el evento desde hoy (0 = hoy, negativo = ya pasó).
function diasHastaEvento1(fechaEventoStr) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const partes = String(fechaEventoStr || '').split('-');
  if (partes.length < 3) return NaN;
  const fechaEvento = new Date(
    parseInt(partes[0]),
    parseInt(partes[1]) - 1,
    parseInt(partes[2])
  );
  fechaEvento.setHours(0, 0, 0, 0);
  return Math.round((fechaEvento - hoy) / (1000 * 60 * 60 * 24));
}

// Avisa al equipo cuando un contrato lleva 2 o más días en Pendiente firma sin enviarse aviso.
function avisoSinFirma1() {
  const ahora    = Date.now();
  const DOS_DIAS = 2 * 24 * 60 * 60 * 1000;
  const pendientes = leerContratos1().filter(function(c) {
    if (esSi1(c.Oculto)) return false;
    if (c.Estatus !== 'Pendiente firma') return false;
    if (c.AvisoSinFirmaEnviado && String(c.AvisoSinFirmaEnviado).trim()) return false;
    const creado = parseFecha1(c.FechaCreacion);
    return creado && (ahora - creado.getTime()) >= DOS_DIAS;
  });
  if (!pendientes.length) return;

  const filas = pendientes.map(function(c) {
    const url = CONFIG1.BASE_URL_PORTAL + '?token=' + c.Token;
    return '<li style="margin-bottom:8px">' +
      '<strong>' + htmlEsc1(c.NombreCliente) + '</strong> — ' +
      htmlEsc1(c.PaqueteNombre || 'Personalizado') + '<br>' +
      'Creado: ' + htmlEsc1(String(c.FechaCreacion).substring(0, 10)) + '<br>' +
      '<a href="' + url + '" style="color:#C9A84C">' + url + '</a>' +
      '</li>';
  }).join('');

  const cuerpo = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1C1C1E">' +
    '<p style="font-weight:700">Contratos sin firmar después de 2 días (' + pendientes.length + '):</p>' +
    '<ul style="padding-left:18px">' + filas + '</ul>' +
    '<p style="color:#9B9B9F;font-size:12px">Considera hacer seguimiento por WhatsApp.</p>' +
    '</div>';

  enviarCorreo1(CONFIG1.EMAIL_ADMIN,
    'Seguimiento: contratos sin firmar — Proposal Inc', cuerpo, []);

  pendientes.forEach(function(c) {
    try {
      actualizarContrato1(c.Token, { AvisoSinFirmaEnviado: new Date().toISOString() });
    } catch (err) {
      Logger.log('avisoSinFirma1: error marcando aviso para ' + c.Token + ': ' + err.message);
    }
  });
  Logger.log('avisoSinFirma1: aviso enviado por ' + pendientes.length + ' contrato(s)');
}

function recordatorio24h1() {
  // Solo ejecutar entre 9 AM y 9 PM hora Monterrey para evitar correos en madrugada.
  const horaActual = parseInt(Utilities.formatDate(new Date(), 'America/Monterrey', 'H'), 10);
  if (horaActual < 9 || horaActual >= 21) return;

  // Previene ejecuciones concurrentes que causan correos duplicados.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) {
    Logger.log('recordatorio24h1: otra instancia en curso, se omite esta ejecucion');
    return;
  }
  try {
    try { avisoSinFirma1(); } catch (err) {
      Logger.log('recordatorio24h1: error en avisoSinFirma1: ' + err.message);
    }
    const manana  = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fechaOk = Utilities.formatDate(manana, 'America/Monterrey', 'yyyy-MM-dd');

    const contratos = leerContratos1();
    contratos.forEach(function(c) {
      if (esSi1(c.Oculto)) return;
      if (['Firmado','Anticipo recibido','Reservado','Liquidado','En produccion'].indexOf(c.Estatus) === -1) return;

      const fechaEvento = parseFecha1(c.FechaEvento);
      if (!fechaEvento) return;
      const fechaEventoStr = Utilities.formatDate(fechaEvento, 'America/Monterrey', 'yyyy-MM-dd');

      // Recordatorio 24 h al cliente.
      // Guard binario: cualquier valor en RecordatorioEnviado bloquea el reenvio.
      // El flag se guarda antes de enviar para garantizar envio unico incluso si Gmail falla.
      if (fechaEventoStr === fechaOk) {
        if (!c.RecordatorioEnviado) {
          try {
            actualizarContrato1(c.Token, { RecordatorioEnviado: new Date().toISOString() });
            enviarCorreo1(c.CorreoCliente,
              'Recordatorio: tu evento es mañana — Proposal Inc',
              correoRecordatorio24h1(c, c.Token), []);
            Logger.log('recordatorio24h1: enviado a ' + c.NombreCliente);
          } catch (err) {
            Logger.log('recordatorio24h1: error para ' + c.Token + ': ' + err.message);
          }
        }
      }

      const dias = diasHastaEvento1(fechaEventoStr);

      // Recordatorio de cobro 3 días antes (Plan 3 Task 4).
      const saldoPendiente  = parseFloat(c.SaldoPendiente || 0);
      const recordatorioSaldo = c.RecordatorioSaldoEnviado && String(c.RecordatorioSaldoEnviado).trim();
      if (saldoPendiente > 0 && dias === 3 && !recordatorioSaldo) {
        try {
          MailApp.sendEmail({
            to     : CONFIG1.EMAIL_ADMIN,
            subject: 'Cobro pendiente en 3 días — ' + c.Folio + ' — ' + c.NombreCliente,
            body   : [
              'Folio: '              + c.Folio,
              'Cliente: '            + c.NombreCliente,
              'Fecha del evento: '   + fechaEventoStr,
              'Saldo pendiente: '    + formatMXN1(saldoPendiente),
              'Portal: '             + CONFIG1.BASE_URL_PORTAL + '?token=' + c.Token,
            ].join('\n'),
          });
          actualizarContrato1(c.Token, { RecordatorioSaldoEnviado: new Date().toISOString() });
          Logger.log('recordatorio24h1: alerta cobro 3 días enviada para ' + c.Folio);
        } catch (err) {
          Logger.log('recordatorio24h1: error alerta cobro para ' + c.Token + ': ' + err.message);
        }
      }

      // Alerta general 2 días antes (Plan 3 Task 4).
      const estatusAlerta = ['Reservado', 'Liquidado'];
      const alertaBruno   = c.AlertaBrunoEnviada && String(c.AlertaBrunoEnviada).trim();
      if (estatusAlerta.indexOf(c.Estatus) !== -1 && dias === 2 && !alertaBruno) {
        try {
          const saldo     = parseFloat(c.SaldoPendiente || 0);
          const adicionales = formatearAdicionalesTexto(c.AdicionalesJSON);
          const cuerpo = [
            'Folio: '    + c.Folio,
            'Cliente: '  + c.NombreCliente,
            (c.NombrePareja ? 'Pareja: ' + c.NombrePareja : ''),
            'Fecha: '    + fechaEventoStr,
            'Hora: '     + formatHoraCorreo1(c.HoraEvento || ''),
            'Locación: ' + (c.Locacion || '') + (c.EspacioLocacion ? ' — ' + c.EspacioLocacion : ''),
            'Paquete: '  + (c.PaqueteClave || ''),
            adicionales,
            'Saldo pendiente: ' + formatMXN1(saldo),
          ].filter(Boolean).join('\n');
          MailApp.sendEmail({
            to     : CONFIG1.EMAIL_ADMIN,
            subject: 'Evento en 2 días — ' + c.Folio + ' — ' + c.NombreCliente,
            body   : cuerpo,
          });
          actualizarContrato1(c.Token, { AlertaBrunoEnviada: new Date().toISOString() });
          Logger.log('recordatorio24h1: alerta 2 días enviada para ' + c.Folio);
        } catch (err) {
          Logger.log('recordatorio24h1: error alerta 2 días para ' + c.Token + ': ' + err.message);
        }
      }
    });
  } finally {
    lock.releaseLock();
  }
}

// === Trigger: detectarPDFsAtascados ===
// Diario. Alerta a Bruno si hay contratos firmados sin PDF tras 15 minutos.

function detectarPDFsAtascados1() {
  const ahora     = Date.now();
  const LIMITE_MS = 15 * 60 * 1000;
  const atascados = [];

  leerContratos1().forEach(function(c) {
    if (!c.FechaFirma || String(c.FechaFirma).trim() === '') return;
    if (c.PdfContratoUrl && String(c.PdfContratoUrl).trim() !== '') return;
    const msFirma = new Date(c.FechaFirma).getTime();
    if (isNaN(msFirma) || ahora - msFirma < LIMITE_MS) return;
    atascados.push(c.NombreCliente + ' (' + c.Folio + '), firmado ' + c.FechaFirma);
  });

  if (!atascados.length) return;

  const cuerpo = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1C1C1E">' +
    '<p style="font-weight:700">Hay ' + atascados.length +
    ' contrato(s) firmado(s) sin PDF después de 15 minutos:</p><ul>' +
    atascados.map(function(a) { return '<li>' + htmlEsc1(a) + '</li>'; }).join('') +
    '</ul><p style="color:#9B9B9F;font-size:12px">Revisa el trigger procesarPDFsPendientes1 en Apps Script.</p></div>';
  enviarCorreo1(CONFIG1.EMAIL_ADMIN, 'Alerta: PDFs atascados — Proposal Inc', cuerpo, []);
  Logger.log('detectarPDFsAtascados1: alerta enviada por ' + atascados.length + ' contrato(s)');
}

// === Trigger: limpiarTokensViejos ===
// Semanal. Elimina tokens cuyo contrato ya no existe.

function limpiarTokensViejos1() {
  const contratosVivos = {};
  leerContratos1().forEach(function(c) { contratosVivos[String(c.Token)] = true; });

  const hoja  = getTokensSheet1();
  const datos = hoja.getDataRange().getValues();
  let eliminados = 0;
  for (let i = datos.length - 1; i >= 1; i--) {
    if (!contratosVivos[String(datos[i][1])]) {
      hoja.deleteRow(i + 1);
      eliminados++;
    }
  }
  Logger.log('limpiarTokensViejos1: ' + eliminados + ' tokens huérfanos eliminados');
}

// === Trigger: respaldarSheets ===
// Semanal. Copia el Sheets completo a la carpeta 04. Respaldos y elimina copias
// con más de 4 semanas.

function respaldarSheets1() {
  try {
    const carpetaSistema   = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
    const carpetaRespaldos = buscarOCrearCarpeta1('04. Respaldos', carpetaSistema);
    const nombre = 'Respaldo — ' + Utilities.formatDate(new Date(), 'America/Monterrey', 'yyyy-MM-dd');
    DriveApp.getFileById(CONFIG1.SHEET_ID).makeCopy(nombre, carpetaRespaldos);
    Logger.log('respaldarSheets1: respaldo creado: ' + nombre);
  } catch (err) {
    Logger.log('respaldarSheets1: error creando respaldo: ' + err.message);
    try {
      MailApp.sendEmail(
        CONFIG1.EMAIL_ADMIN,
        'Error en respaldo automático — Proposal Inc',
        'El respaldo automático del Sheets falló el ' +
        Utilities.formatDate(new Date(), 'America/Monterrey', 'yyyy-MM-dd HH:mm') +
        '.\n\nError: ' + err.message
      );
    } catch (e) {
      Logger.log('respaldarSheets1: no se pudo enviar alerta al admin: ' + e);
    }
    return;
  }

  // Limpieza de respaldos con más de 4 semanas. Un fallo aquí no invalida el respaldo creado.
  try {
    const limite = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const carpetaSistema   = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
    const carpetaRespaldos = buscarOCrearCarpeta1('04. Respaldos', carpetaSistema);
    const iter = carpetaRespaldos.getFiles();
    while (iter.hasNext()) {
      const archivo = iter.next();
      if (archivo.getName().indexOf('Respaldo — ') === 0 && archivo.getDateCreated() < limite) {
        archivo.setTrashed(true);
      }
    }
  } catch (errLimpieza) {
    Logger.log('respaldarSheets1: error en limpieza de respaldos viejos: ' + errLimpieza.message);
  }
}

// === Instalador de triggers ===
// Ejecutar UNA vez desde el editor de Apps Script después de desplegar.

function instalarTriggers1() {
  const FUNCIONES = [
    'procesarPDFsPendientes1', 'recordatorio24h1', 'detectarPDFsAtascados1',
    'limpiarTokensViejos1', 'respaldarSheets1',
  ];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (FUNCIONES.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('procesarPDFsPendientes1').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('recordatorio24h1').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('detectarPDFsAtascados1').timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('limpiarTokensViejos1').timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
  ScriptApp.newTrigger('respaldarSheets1').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();

  Logger.log('instalarTriggers1: 5 triggers instalados');
}

// === Plantillas de correo ===

function _encabezadoCorreo1() {
  return '<div style="background:#1C1C1E;padding:22px 24px;text-align:center">' +
         '<p style="margin:0;font-size:18px;font-weight:700;letter-spacing:2px;color:#FAFAFA">PROPOSAL INC</p>' +
         '</div>';
}

function _pieCorreo1() {
  return '<div style="padding:16px 24px;text-align:center;border-top:1px solid #E8E8EA">' +
         '<p style="margin:0;font-size:11px;color:#9B9B9F">Proposal Inc · Monterrey, Nuevo León</p>' +
         '</div>';
}

function _botonCorreo1(texto, url) {
  return '<a href="' + url + '" style="display:block;background:#C9A84C;color:#1C1C1E;' +
    'text-decoration:none;text-align:center;padding:14px;font-weight:700;font-size:13px;' +
    'border-radius:6px;margin:16px 0">' + texto + '</a>';
}

function _filaCorreo1(etiqueta, valor) {
  return '<tr>' +
    '<td style="padding:7px 0;border-bottom:1px solid #E8E8EA;font-size:13px;color:#9B9B9F;width:150px">' +
      htmlEsc1(etiqueta) + '</td>' +
    '<td style="padding:7px 0;border-bottom:1px solid #E8E8EA;font-size:13px;font-weight:600;color:#1C1C1E">' +
      htmlEsc1(valor) + '</td></tr>';
}

function correoContratoFirmadoAdmin1(contrato) {
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 14px;font-size:17px;color:#1C1C1E">Contrato firmado</h2>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        _filaCorreo1('Cliente', contrato.NombreCliente) +
        _filaCorreo1('Folio', contrato.Folio) +
        _filaCorreo1('Correo', contrato.CorreoCliente) +
        _filaCorreo1('Teléfono', contrato.TelefonoCliente) +
        _filaCorreo1('Precio total', formatMXN1(contrato.Precio)) +
        _filaCorreo1('Anticipo esperado', formatMXN1(contrato.Anticipo)) +
      '</table>' +
      '<p style="font-size:13px;color:#444;margin:0">Cuando recibas el pago, regístralo desde el panel de administración.</p>' +
    '</div>' + _pieCorreo1() + '</div>';
}

function correoContratoPDF1(contrato, token) {
  const urlPortal = CONFIG1.BASE_URL_PORTAL + '?token=' + token;
  // BUG-012: nombre completo en el saludo.
  const nombre1   = String(contrato.NombreCliente || '').trim() || 'cliente';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Hola, ' + htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 8px">' +
        'Adjunto encontrarás tu contrato firmado. También puedes consultarlo en tu portal en cualquier momento.</p>' +
      _botonCorreo1('VER MI PORTAL', urlPortal) +
      '<p style="font-size:12px;color:#9B9B9F;text-align:center;margin:0">Folio: ' +
        htmlEsc1(contrato.Folio) + '</p>' +
    '</div>' + _pieCorreo1() + '</div>';
}

function correoEntregaCliente1(contrato, token) {
  const urlPortal = CONFIG1.BASE_URL_PORTAL + '?token=' + token;
  // BUG-012: nombre completo en el saludo.
  const nombre1   = String(contrato.NombreCliente || '').trim() || 'cliente';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Tu material está listo, ' +
        htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 8px">' +
        'Ya puedes descargar las fotografías y el video de tu evento desde tu portal.</p>' +
      _botonCorreo1('VER Y DESCARGAR MI MATERIAL', urlPortal) +
      '<p style="font-size:12px;color:#9B9B9F;text-align:center;margin:0">Folio: ' +
        htmlEsc1(contrato.Folio) + '</p>' +
    '</div>' + _pieCorreo1() + '</div>';
}

function correoRecordatorio24h1(contrato, token) {
  const urlPortal = CONFIG1.BASE_URL_PORTAL + '?token=' + token;
  // BUG-012: nombre completo en el saludo.
  const nombre1   = String(contrato.NombreCliente || '').trim() || 'cliente';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Tu evento es mañana, ' +
        htmlEsc1(nombre1) + '.</h2>' +
      '<table style="width:100%;border-collapse:collapse;margin:14px 0">' +
        _filaCorreo1('Fecha', formatFechaEspanol1(contrato.FechaEvento)) +
        (contrato.HoraEvento ? _filaCorreo1('Horario', formatHoraCorreo1(contrato.HoraEvento)) : '') +
        _filaCorreo1('Locación', contrato.Locacion) +
        (contrato.EspacioLocacion && !sinAcentos1(contrato.Locacion || '').includes('safi')
          ? _filaCorreo1('Espacio', contrato.EspacioLocacion) : '') +
      '</table>' +
      '<p style="font-size:12px;color:#9B9B9F;margin:0">' +
        '¿Necesitas algo? Escríbenos por <a href="' + CONFIG1.WA_LINK +
        '" style="color:#C9A84C;text-decoration:none">WhatsApp</a>.</p>' +
    '</div>' + _pieCorreo1() + '</div>';
}

// === Confirmar reservación con locación ===

// Garantiza que la columna ReservacionConfirmada exista en el encabezado.
function asegurarColumnaReservacion1() {
  const hoja = getContratosSheet1();
  const enc  = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  if (enc.indexOf('ReservacionConfirmada') === -1) {
    hoja.getRange(1, hoja.getLastColumn() + 1).setValue('ReservacionConfirmada');
  }
}

// Garantiza que una columna arbitraria exista en el encabezado de Contratos1.
// Usada para columnas nuevas que se agregan en versiones posteriores del script.
function asegurarColumnaContratos1(nombre) {
  const hoja = getContratosSheet1();
  const enc  = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  if (enc.indexOf(nombre) === -1) {
    hoja.getRange(1, hoja.getLastColumn() + 1).setValue(nombre);
  }
}

// Formatea un valor de hora (Date o string HH:MM) en formato 12 h con a.m./p.m.
function formatHoraCorreo1(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val)) {
    const h = val.getHours(), m = val.getMinutes();
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }
  const match = String(val).match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1]), m = parseInt(match[2]);
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }
  return String(val);
}

// Verifica que CalendarApp tiene permiso y que el calendario por defecto es accesible.
// Ejecutar esta funcion una sola vez desde el editor para confirmar el scope de Calendar.
function testCalendar1() {
  const cal = CalendarApp.getDefaultCalendar();
  Logger.log('Calendario OK: ' + cal.getName());
}

// Prueba end-to-end de Calendar: crea un evento de prueba mañana a las 19:00
// y luego lo borra. Si llega al log "evento creado" + "evento eliminado", el
// stack completo de CalendarApp (crear, leer por ID, borrar) funciona.
function testCalendarCrearYBorrar1() {
  const cal = CalendarApp.getDefaultCalendar();
  Logger.log('Calendario: ' + cal.getName() + ' (' + cal.getId() + ')');

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  manana.setHours(19, 0, 0, 0);
  const fin = new Date(manana.getTime() + 60 * 60 * 1000);

  const evento = cal.createEvent(
    '[TEST] Proposal Inc — evento de prueba',
    manana,
    fin,
    {
      description: 'Evento generado por testCalendarCrearYBorrar1. Se elimina automáticamente.',
      location   : 'Monterrey, N.L.',
    }
  );
  const id = evento.getId();
  Logger.log('Evento creado: ' + id + ' | fecha: ' + manana.toString());

  // Leer por ID para verificar que se puede recuperar (mismo flujo que usa accionReagendarContrato1).
  const recuperado = CalendarApp.getEventById(id);
  Logger.log('Evento recuperado por ID: ' + (recuperado ? 'OK' : 'FALLO'));

  // Borrar.
  evento.deleteEvent();
  Logger.log('Evento eliminado correctamente.');

  Logger.log('Calendar end-to-end OK.');
}

// Prueba end-to-end de Drive: crea una carpeta y un archivo de prueba dentro
// de la carpeta del sistema, luego los borra. Confirma el stack de DriveApp.
function testDriveCrearYBorrar1() {
  const carpetaSistema = DriveApp.getFolderById(CONFIG1.CARPETA_SISTEMA_ID);
  Logger.log('Carpeta sistema: ' + carpetaSistema.getName());

  const carpetaTest = carpetaSistema.createFolder('[TEST] proposal-inc-test-' + Date.now());
  Logger.log('Carpeta creada: ' + carpetaTest.getName() + ' (' + carpetaTest.getId() + ')');

  const blob    = Utilities.newBlob('contenido de prueba', 'text/plain', 'prueba.txt');
  const archivo = carpetaTest.createFile(blob);
  Logger.log('Archivo creado: ' + archivo.getName() + ' (' + archivo.getId() + ')');

  // Borrar.
  archivo.setTrashed(true);
  carpetaTest.setTrashed(true);
  Logger.log('Archivo y carpeta movidos a la papelera correctamente.');
  Logger.log('Drive end-to-end OK.');
}

// Crea un evento en el calendario principal con los datos del contrato.
// Construye la descripcion del evento de Calendar con los datos del contrato.
// Usada tanto al crear el evento como al actualizarlo.
function buildDescripcionEvento1(contrato) {
  const lineas = [
    'Cliente: '  + (contrato.NombreCliente   || ''),
    'Pareja: '   + (contrato.NombrePareja    || ''),
    'Paquete: '  + (contrato.PaqueteNombre   || ''),
    'Teléfono: ' + (contrato.TelefonoCliente || ''),
  ];
  const cancion = String(contrato.CancionEvento || '').trim();
  if (cancion) lineas.push('Música: ' + cancion);
  if (String(contrato.FamiliaAsiste || '') === 'Sí') {
    const num = String(contrato.FamiliaNumero || '').trim();
    lineas.push('Familia/amigos: Sí' + (num ? ' (' + num + ' personas)' : ''));
  }
  const alergias = String(contrato.AlergiasAlimentarias || '').trim();
  if (alergias) lineas.push('Alergias: ' + alergias);
  if (contrato.NotasContrato)  lineas.push('Notas: '          + contrato.NotasContrato);
  if (contrato.NotasInternas)  lineas.push('Notas internas: ' + contrato.NotasInternas);
  const carpetaId = String(contrato.CarpetaProyectoID || '').trim();
  if (carpetaId) lineas.push('Drive: https://drive.google.com/drive/folders/' + carpetaId);
  return lineas.join('\n');
}

// Actualiza la descripcion del evento de Calendar existente con los datos
// actuales del contrato. No crea un nuevo evento ni mueve la fecha.
function actualizarDescripcionEventoCalendario1(contrato) {
  if (!contrato) return;
  const eventoId = String(contrato.EventoCalendarioID || '').trim();
  if (!eventoId) return;
  try {
    const evento = CalendarApp.getEventById(eventoId);
    if (!evento) return;
    evento.setDescription(buildDescripcionEvento1(contrato));
  } catch (err) {
    Logger.log('actualizarDescripcionEventoCalendario1: ' + err.message);
  }
}

function crearEventoCalendario1(contrato) {
  if (!contrato) { Logger.log('crearEventoCalendario1: contrato undefined, nada que hacer'); return; }
  const fecha = parseFecha1(contrato.FechaEvento);
  if (!fecha) return;
  let h = 19, m = 0;
  const horaRaw = contrato.HoraEvento;
  if (horaRaw instanceof Date && !isNaN(horaRaw)) {
    h = horaRaw.getHours(); m = horaRaw.getMinutes();
  } else {
    const match = String(horaRaw || '').match(/(\d{1,2}):(\d{2})/);
    if (match) { h = parseInt(match[1]); m = parseInt(match[2]); }
  }
  const inicio  = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), h, m, 0);
  const fin     = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
  const espacio = String(contrato.EspacioLocacion || '').trim();
  const titulo  = (contrato.Folio || '') + ' — ' + (contrato.Locacion || '') +
                  (espacio ? ' · ' + espacio : '') +
                  (contrato.PaqueteNombre ? ' · ' + contrato.PaqueteNombre : '');
  const ubicacion = DIRECCIONES_LOCACION1[contrato.Locacion] || contrato.Locacion || '';
  const desc = buildDescripcionEvento1(contrato);
  const evento = CalendarApp.getDefaultCalendar().createEvent(titulo, inicio, fin, {
    location   : (espacio ? espacio + ', ' : '') + ubicacion,
    description: desc,
  });
  if (evento && contrato.Token) {
    actualizarContrato1(contrato.Token, { EventoCalendarioID: evento.getId() });
  }
}

// Construye el correo de confirmación de reservación que se envía al cliente.
function correoReservacionConfirmada1(contrato) {
  // BUG-012: nombre completo en el saludo.
  const nombre1 = String(contrato.NombreCliente || '').trim() || 'cliente';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Hola, ' +
        htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px">' +
        'Tu reservación está confirmada. Te esperamos en:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        _filaCorreo1('Fecha',    formatFechaEspanol1(contrato.FechaEvento)) +
        (contrato.HoraEvento
          ? _filaCorreo1('Hora', formatHoraCorreo1(contrato.HoraEvento)) : '') +
        _filaCorreo1('Locación', contrato.Locacion) +
        (contrato.EspacioLocacion && !sinAcentos1(contrato.Locacion || '').includes('safi')
          ? _filaCorreo1('Espacio', contrato.EspacioLocacion) : '') +
      '</table>' +
      '<p style="font-size:13px;color:#444;margin:0">' +
        'Cualquier duda, escríbenos por WhatsApp.</p>' +
      _botonCorreo1('ESCRIBIR POR WHATSAPP', CONFIG1.WA_LINK) +
    '</div>' + _pieCorreo1() + '</div>';
}

// Endpoint POST: confirmarReservacion.
function accionConfirmarReservacion1(body) {
  const token   = String(body.token   || '').trim();
  const espacio = String(body.espacio || '').trim();
  if (!token)   return jsonResponse1({ error: 'Token requerido' });
  if (!espacio) return jsonResponse1({ error: 'El espacio de la locación es obligatorio' });

  // I5: candado para evitar que dos clics simultaneos creen dos eventos de Calendar.
  let esReintento = false;
  let ahora = '';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const contrato = obtenerContrato1(token);
    if (!contrato) return jsonResponse1({ error: 'Contrato no encontrado' });

    // Bloqueada solo si ya tiene AMBOS: confirmacion y evento de Calendar.
    // Si falta el evento (fallo previo de Calendar), se permite reintentar solo esa parte.
    const eventoIdExistente = String(contrato.EventoCalendarioID || '').trim();
    if (contrato.ReservacionConfirmada && eventoIdExistente) {
      return jsonResponse1({ error: 'La reservación ya fue confirmada anteriormente.' });
    }
    esReintento = !!(contrato.ReservacionConfirmada && !eventoIdExistente);
    ahora = String(contrato.ReservacionConfirmada || '');

    if (!esReintento) {
      // Primera confirmacion: validar estatus y restricciones.
      // Previene degradar un contrato que ya avanzó más allá de Anticipo recibido.
      const ESTATUSES_CONFIRMABLES = ['Firmado', 'Anticipo recibido'];
      if (ESTATUSES_CONFIRMABLES.indexOf(contrato.Estatus) === -1) {
        return jsonResponse1({ error: 'La reservación no puede confirmarse en el estatus actual: ' + contrato.Estatus });
      }

      // Aplicar la misma restricción de Isla-sábado que valida accionCrearContrato1.
      const diaEventoConf = parseFecha1(contrato.FechaEvento);
      if (diaEventoConf && diaEventoConf.getDay() === 6 &&
          sinAcentos1(contrato.Locacion || '').includes('rincon') &&
          sinAcentos1(espacio).includes('isla')) {
        return jsonResponse1({ error: 'La Isla de Rincón de Santiago no está disponible los sábados.' });
      }

      asegurarColumnaReservacion1();
      ahora = new Date().toISOString();
      actualizarContrato1(token, {
        EspacioLocacion      : espacio,
        ReservacionConfirmada: ahora,
        Estatus              : 'Reservado',
      });
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }

  const contratoActualizado = obtenerContrato1(token);
  if (!contratoActualizado) {
    return jsonResponse1({ error: 'No se pudo releer el contrato tras la actualización. Intenta de nuevo.' });
  }

  // Crear carpeta solo si no existe aún (idempotente).
  if (!String(contratoActualizado.CarpetaProyectoID || '').trim()) {
    try {
      const carpetaId = crearCarpetaProyecto1(contratoActualizado);
      if (carpetaId) {
        actualizarContrato1(token, { CarpetaProyectoID: carpetaId });
        contratoActualizado.CarpetaProyectoID = carpetaId;
      }
    } catch (err) {
      Logger.log('confirmarReservacion - carpeta: ' + err.message);
    }
  }

  // Crear evento de Calendar (se intenta siempre — sea primera vez o reintento).
  try {
    crearEventoCalendario1(contratoActualizado);
  } catch (err) {
    Logger.log('confirmarReservacion - calendario: ' + err.message);
  }

  // Correos: solo en la primera confirmacion, no en reintentos.
  if (!esReintento) {
    try {
      enviarCorreo1(
        contratoActualizado.CorreoCliente,
        'Tu reservación está confirmada — Proposal Inc',
        correoReservacionConfirmada1(contratoActualizado),
        []
      );
    } catch (err) {
      Logger.log('confirmarReservacion - correo: ' + err.message);
    }
    // Correo de coordinación interna (Plan 3 Task 2).
    try {
      const correoCoord = [
        'Folio: '    + contratoActualizado.Folio,
        'Cliente: '  + contratoActualizado.NombreCliente,
        'Fecha: '    + contratoActualizado.FechaEvento,
        'Hora: '     + formatHoraCorreo1(contratoActualizado.HoraEvento || ''),
        'Locación: ' + (contratoActualizado.Locacion || '') + ' — ' + (espacio || ''),
        formatearAdicionalesTexto(contratoActualizado.AdicionalesJSON),
        '',
        'Coordinar con proveedor de letras y de pétalos según el paquete.',
        '',
        'Portal: ' + CONFIG1.BASE_URL_PORTAL + '?token=' + token,
      ].filter(Boolean).join('\n');
      MailApp.sendEmail({
        to     : CONFIG1.EMAIL_ADMIN,
        subject: 'Reservación confirmada — ' + contratoActualizado.Folio + ' — ' + contratoActualizado.NombreCliente,
        body   : correoCoord,
      });
    } catch (err) {
      Logger.log('confirmarReservacion - correo coordinacion: ' + err.message);
    }
  }

  return jsonResponse1({ ok: true, timestamp: ahora });
}

// Construye el correo de recibo simple que se envía al cliente al registrar un abono.
function correoReciboAbono1(contrato, monto, saldoRestante) {
  // BUG-012: nombre completo en el saludo.
  const nombre1 = String(contrato.NombreCliente || '').trim() || 'cliente';
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Hola, ' +
        htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px">' +
        'Recibimos tu pago. Aquí está el resumen:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        _filaCorreo1('Folio',         contrato.Folio           || '') +
        _filaCorreo1('Pago recibido', formatMXN1(monto))              +
        _filaCorreo1('Saldo restante', formatMXN1(saldoRestante))     +
      '</table>' +
      '<p style="font-size:13px;color:#444;margin:0">' +
        'Cualquier duda, escríbenos por WhatsApp.</p>' +
      _botonCorreo1('ESCRIBIR POR WHATSAPP', CONFIG1.WA_LINK) +
    '</div>' + _pieCorreo1() + '</div>';
}

// Construye el correo de recordatorio de pago que Bruno envía manualmente al cliente.
function correoRecordatorioPago1(contrato) {
  const nombre1 = String(contrato.NombreCliente || '').trim() || 'cliente';
  const saldo   = parseFloat(contrato.SaldoPendiente) || 0;
  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Hola, ' +
        htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px">' +
        'Te recordamos que tienes un saldo pendiente para tu evento con Proposal Inc. ' +
        'Puedes realizar el pago por transferencia o depósito:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
        _filaCorreo1('Folio',             contrato.Folio || '') +
        _filaCorreo1('Fecha del evento',  formatFechaEspanol1(contrato.FechaEvento)) +
        _filaCorreo1('Saldo pendiente',   formatMXN1(saldo)) +
        _filaCorreo1('Banco',             CONFIG1.BANCO) +
        _filaCorreo1('CLABE',             CONFIG1.CLABE) +
        _filaCorreo1('OXXO / 7-Eleven',  CONFIG1.TARJETA) +
        _filaCorreo1('Titular',           CONFIG1.TITULAR) +
      '</table>' +
      '<p style="font-size:13px;color:#444;margin:0">' +
        'Cualquier duda, escríbenos por WhatsApp.</p>' +
      _botonCorreo1('ESCRIBIR POR WHATSAPP', CONFIG1.WA_LINK) +
    '</div>' + _pieCorreo1() + '</div>';
}

// Construye el correo de reseña que se envía al cliente después de la entrega (Plan 1 Task 7).
function correoResena1(contrato) {
  // BUG-012: nombre completo en el saludo.
  const nombre1   = String(contrato.NombreCliente || '').trim() || 'cliente';
  const pareja    = String(contrato.NombrePareja  || '').trim();
  const fotoLista = !!(contrato.FotografiaLista && String(contrato.FotografiaLista).trim());
  const vidListo  = !!(contrato.VideoListo       && String(contrato.VideoListo).trim());

  let material;
  if (fotoLista && vidListo) material = 'tus fotos y video';
  else if (vidListo)         material = 'tu video';
  else                       material = 'tus fotos';

  const desc = pareja
    ? material + ' junto a ' + htmlEsc1(pareja) + ' ya están listos'
    : material + ' ya están listos';

  const driveLink = String(contrato.EntregaDriveLink || '').trim();

  return '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
    _encabezadoCorreo1() +
    '<div style="padding:28px 24px;background:#FAFAFA">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#1C1C1E">Hola, ' + htmlEsc1(nombre1) + '.</h2>' +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px">' +
        'Gracias por confiar en nosotros para ese momento tan especial. ' + htmlEsc1(desc) + '.</p>' +
      (driveLink ? _botonCorreo1('VER MI MATERIAL', driveLink) : '') +
      '<p style="font-size:14px;color:#444;line-height:1.7;margin:16px 0 8px">' +
        'Si quieres compartir tu experiencia, puedes etiquetarnos en Instagram:</p>' +
      '<p style="text-align:center;margin:0 0 16px">' +
        '<a href="https://www.instagram.com/proposal.inc/" style="color:#C9A84C;font-weight:700;font-size:15px;text-decoration:none">@proposal.inc</a></p>' +
      '<p style="font-size:12px;color:#9B9B9F;text-align:center;margin:0">Gracias por permitirnos ser parte de tu historia.</p>' +
    '</div>' + _pieCorreo1() + '</div>';
}

// === Endpoints de Disponibilidad Safi ===

// Convierte un valor de celda de fecha a string YYYY-MM-DD.
// Sheets devuelve Date objects cuando la celda tiene formato de fecha.
function fechaCeldaStr1(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).substring(0, 10);
}

// Devuelve todas las fechas registradas en DisponibilidadSafi.
// Las fechas sin fila en el Sheets son implícitamente 'libre'.
// Endpoint público: no requiere adminKey.
function accionDisponibilidadObtener1(e) {
  const ss   = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
  const hoja = ss.getSheetByName('DisponibilidadSafi');
  if (!hoja) return jsonResponse1({ error: 'Hoja DisponibilidadSafi no encontrada.' });

  const datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return jsonResponse1({ ok: true, fechas: [] });

  const enc    = datos[0];
  const fechas = [];
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[enc.indexOf('Fecha')]) continue;
    var notaVal = String(fila[enc.indexOf('Nota')] || '').trim();
    var entry = {
      fecha : fechaCeldaStr1(fila[enc.indexOf('Fecha')]),
      estado: String(fila[enc.indexOf('Estado')] || 'libre'),
    };
    if (notaVal) entry.nota = notaVal;
    fechas.push(entry);
  }
  return jsonResponse1({ ok: true, fechas: fechas });
}

// Wrapper GET para disponibilidadGuardar. Evita el preflight CORS que bloquea el POST
// en browsers sin extension. Lee los mismos parametros via e.parameter.
function accionDisponibilidadGuardarGet1(e) {
  if ((e.parameter.adminKey || '') !== CONFIG1.ADMIN_KEY) {
    return jsonResponse1({ error: 'No autorizado' });
  }
  var cambiosRaw = e.parameter.cambios || '[]';
  var usuario    = e.parameter.usuario || 'admin';
  var body = { cambios: JSON.parse(cambiosRaw), usuario: usuario };
  return accionDisponibilidadGuardar1(body);
}

// Guarda un lote de cambios de disponibilidad.
// body.cambios: [{ fecha: 'YYYY-MM-DD', estado: 'libre'|'parcial'|'bloqueada' }]
// body.usuario: nombre del usuario que hace el cambio.
// Requiere adminKey.
function accionDisponibilidadGuardar1(body) {
  var cambios = body.cambios;
  if (!Array.isArray(cambios) || cambios.length === 0) {
    return jsonResponse1({ error: 'No se recibieron cambios.' });
  }
  var usuario = String(body.usuario || 'admin').trim();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonResponse1({ error: 'No se pudo obtener el bloqueo. Intenta de nuevo.' });
  }

  try {
    var ss   = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
    var hoja = ss.getSheetByName('DisponibilidadSafi');
    if (!hoja) return jsonResponse1({ error: 'Hoja DisponibilidadSafi no encontrada.' });

    // Leer estado actual para construir índice { fecha: filaIndex (1-based) }.
    var datos = hoja.getDataRange().getValues();
    var enc   = datos[0];
    var colFecha        = enc.indexOf('Fecha');
    var colEstado       = enc.indexOf('Estado');
    var colNota         = enc.indexOf('Nota');
    var colActualPor    = enc.indexOf('ActualizadoPor');
    var colActualEn     = enc.indexOf('ActualizadoEn');

    // Mapa de fecha (string YYYY-MM-DD) a índice de fila en el array (0-based, donde 0 es el header).
    var indiceFechas = {};
    for (var i = 1; i < datos.length; i++) {
      var f = fechaCeldaStr1(datos[i][colFecha]);
      if (f) indiceFechas[f] = i;
    }

    var ahora   = new Date().toISOString();
    var resumen = [];

    cambios.forEach(function(cambio) {
      var fecha  = String(cambio.fecha  || '').trim();
      var estado = String(cambio.estado || '').trim();
      var nota   = String(cambio.nota   || '').trim();
      if (!fecha || !estado) return;
      if (['libre', 'parcial', 'bloqueada'].indexOf(estado) === -1) return;

      var estadoAnterior = 'libre';
      var notaAnterior   = '';
      var filaIdx        = indiceFechas[fecha];

      if (filaIdx !== undefined) {
        estadoAnterior = String(datos[filaIdx][colEstado] || 'libre');
        notaAnterior   = String(datos[filaIdx][colNota]   || '').trim();
      }

      // Sin cambio real en estado ni nota — omitir.
      if (estadoAnterior === estado && notaAnterior === nota) return;

      if (estado === 'libre') {
        // La fecha no existe en el sheet: ya es libre por ausencia, nada que borrar.
        if (filaIdx === undefined) return;
        hoja.deleteRow(filaIdx + 1);
        delete indiceFechas[fecha];
        Object.keys(indiceFechas).forEach(function(f) {
          if (indiceFechas[f] > filaIdx) indiceFechas[f]--;
        });
        datos.splice(filaIdx, 1);
      } else if (filaIdx !== undefined) {
        hoja.getRange(filaIdx + 1, colEstado + 1).setValue(estado);
        hoja.getRange(filaIdx + 1, colNota    + 1).setValue(nota);
        hoja.getRange(filaIdx + 1, colActualPor + 1).setValue(usuario);
        hoja.getRange(filaIdx + 1, colActualEn  + 1).setValue(ahora);
        datos[filaIdx][colEstado]    = estado;
        datos[filaIdx][colNota]      = nota;
        datos[filaIdx][colActualPor] = usuario;
        datos[filaIdx][colActualEn]  = ahora;
      } else {
        var nuevaFila = [];
        nuevaFila[colFecha]     = fecha;
        nuevaFila[colEstado]    = estado;
        nuevaFila[colNota]      = nota;
        nuevaFila[colActualPor] = usuario;
        nuevaFila[colActualEn]  = ahora;
        hoja.appendRow(nuevaFila);
        datos.push(nuevaFila);
        indiceFechas[fecha] = datos.length - 1;
      }

      resumen.push({ fecha: fecha, estadoAnterior: estadoAnterior, estadoNuevo: estado });
    });

    // Registrar en el log de Safi si hubo cambios efectivos.
    if (resumen.length > 0) {
      var hojaLog = ss.getSheetByName('DisponibilidadSafi Log');
      if (hojaLog) {
        hojaLog.appendRow([ahora, usuario, resumen.length, JSON.stringify(resumen)]);
      }
    }

    return jsonResponse1({ ok: true, procesados: resumen.length });

  } finally {
    lock.releaseLock();
  }
}

// === Endpoints de Disponibilidad Rincón de Santiago ===

function accionDisponibilidadRinconObtener1(e) {
  var ss   = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
  var hoja = ss.getSheetByName('DisponibilidadRincon');
  if (!hoja) return jsonResponse1({ error: 'Hoja DisponibilidadRincon no encontrada.' });

  var datos = hoja.getDataRange().getValues();
  if (datos.length <= 1) return jsonResponse1({ ok: true, fechas: [] });

  var enc    = datos[0];
  var fechas = [];
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[enc.indexOf('Fecha')]) continue;
    var notaVal = String(fila[enc.indexOf('Nota')] || '').trim();
    var entry = {
      fecha : fechaCeldaStr1(fila[enc.indexOf('Fecha')]),
      estado: String(fila[enc.indexOf('Estado')] || 'libre'),
    };
    if (notaVal) entry.nota = notaVal;
    fechas.push(entry);
  }
  return jsonResponse1({ ok: true, fechas: fechas });
}

function accionDisponibilidadRinconGuardarGet1(e) {
  if ((e.parameter.adminKey || '') !== CONFIG1.ADMIN_KEY) {
    return jsonResponse1({ error: 'No autorizado' });
  }
  var cambiosRaw = e.parameter.cambios || '[]';
  var usuario    = e.parameter.usuario || 'admin';
  var body = { cambios: JSON.parse(cambiosRaw), usuario: usuario };
  return accionDisponibilidadRinconGuardar1(body);
}

function accionDisponibilidadRinconGuardar1(body) {
  var cambios = body.cambios;
  if (!Array.isArray(cambios) || cambios.length === 0) {
    return jsonResponse1({ error: 'No se recibieron cambios.' });
  }
  var usuario = String(body.usuario || 'admin').trim();

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch (e) { return jsonResponse1({ error: 'No se pudo obtener el bloqueo. Intenta de nuevo.' }); }

  try {
    var ss   = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
    var hoja = ss.getSheetByName('DisponibilidadRincon');
    if (!hoja) return jsonResponse1({ error: 'Hoja DisponibilidadRincon no encontrada.' });

    var datos = hoja.getDataRange().getValues();
    var enc   = datos[0];
    var colFecha     = enc.indexOf('Fecha');
    var colEstado    = enc.indexOf('Estado');
    var colNota      = enc.indexOf('Nota');
    var colActualPor = enc.indexOf('ActualizadoPor');
    var colActualEn  = enc.indexOf('ActualizadoEn');

    var indiceFechas = {};
    for (var i = 1; i < datos.length; i++) {
      var f = fechaCeldaStr1(datos[i][colFecha]);
      if (f) indiceFechas[f] = i;
    }

    var ahora   = new Date().toISOString();
    var resumen = [];

    cambios.forEach(function(cambio) {
      var fecha  = String(cambio.fecha  || '').trim();
      var estado = String(cambio.estado || '').trim();
      var nota   = String(cambio.nota   || '').trim();
      if (!fecha || !estado) return;
      if (['libre', 'parcial', 'bloqueada'].indexOf(estado) === -1) return;

      var estadoAnterior = 'libre';
      var notaAnterior   = '';
      var filaIdx        = indiceFechas[fecha];

      if (filaIdx !== undefined) {
        estadoAnterior = String(datos[filaIdx][colEstado] || 'libre');
        notaAnterior   = String(datos[filaIdx][colNota]   || '').trim();
      }

      if (estadoAnterior === estado && notaAnterior === nota) return;

      if (estado === 'libre') {
        // La fecha no existe en el sheet: ya es libre por ausencia, nada que borrar.
        if (filaIdx === undefined) return;
        hoja.deleteRow(filaIdx + 1);
        delete indiceFechas[fecha];
        Object.keys(indiceFechas).forEach(function(f) {
          if (indiceFechas[f] > filaIdx) indiceFechas[f]--;
        });
        datos.splice(filaIdx, 1);
      } else if (filaIdx !== undefined) {
        hoja.getRange(filaIdx + 1, colEstado + 1).setValue(estado);
        hoja.getRange(filaIdx + 1, colNota    + 1).setValue(nota);
        hoja.getRange(filaIdx + 1, colActualPor + 1).setValue(usuario);
        hoja.getRange(filaIdx + 1, colActualEn  + 1).setValue(ahora);
        datos[filaIdx][colEstado]    = estado;
        datos[filaIdx][colNota]      = nota;
        datos[filaIdx][colActualPor] = usuario;
        datos[filaIdx][colActualEn]  = ahora;
      } else {
        var nuevaFila = [];
        nuevaFila[colFecha]     = fecha;
        nuevaFila[colEstado]    = estado;
        nuevaFila[colNota]      = nota;
        nuevaFila[colActualPor] = usuario;
        nuevaFila[colActualEn]  = ahora;
        hoja.appendRow(nuevaFila);
        datos.push(nuevaFila);
        indiceFechas[fecha] = datos.length - 1;
      }
      resumen.push({ fecha: fecha, estadoAnterior: estadoAnterior, estadoNuevo: estado });
    });

    if (resumen.length > 0) {
      var hojaLog = ss.getSheetByName('DisponibilidadRinconLog');
      if (hojaLog) hojaLog.appendRow([ahora, usuario, resumen.length, JSON.stringify(resumen)]);
    }

    return jsonResponse1({ ok: true, procesados: resumen.length });

  } finally {
    lock.releaseLock();
  }
}

// === Funciones de prueba. Ejecutar desde el editor para verificar cada parte. ===

function probarUtilidades1() {
  Logger.log('Folio base: '       + folioBase1('2026-06-15'));
  Logger.log('Apellido: '         + extraerApellido1('Juan Carlos García López'));
  Logger.log('Fecha formateada: ' + formatFechaEspanol1('2026-06-15'));
  Logger.log('Monto: '            + formatMXN1(12500));
}

function probarHojas1() {
  try {
    Logger.log('Contratos1 columnas: ' + getContratosSheet1().getLastColumn());
    Logger.log('Tokens1 columnas: '    + getTokensSheet1().getLastColumn());
    Logger.log('Abonos1 columnas: '    + getAbonosSheet1().getLastColumn());
    Logger.log('Paquetes1 filas: '     + (getPaquetesSheet1().getLastRow() - 1));
  } catch (err) {
    Logger.log('ERROR probarHojas1: ' + err.message);
  }
}

function probarPaquetes1() {
  const activos = obtenerPaquetesActivos1();
  Logger.log('Paquetes activos: ' + activos.length);
  Logger.log('Bases: '       + activos.filter(function(p) { return !p.EsAdicional; }).map(function(p) { return p.Clave; }).join(', '));
  Logger.log('Adicionales: ' + activos.filter(function(p) { return  p.EsAdicional; }).map(function(p) { return p.Clave; }).join(', '));
}

// === Prueba de envío de correo ===
// Ejecutar manualmente desde el editor de Apps Script (botón ▶) para verificar
// que MailApp puede enviar correos. El destinatario es EMAIL_ADMIN.
// Si llega, la cuota y los scopes están bien. Si no llega, revisar:
//   - El primer envío puede requerir autorización (la primera vez Apps Script
//     pide permisos al ejecutar).
//   - Cuota diaria de MailApp (100/día en cuenta personal, 1500/día en Workspace).
function enviarCorreoTest1() {
  const para = CONFIG1.EMAIL_ADMIN;
  const asunto = '[TEST] Proposal Inc — verificación de envío de correo';
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">' +
      '<div style="padding:24px;background:#FAFAFA;border:1px solid #E5E5E7;border-radius:8px">' +
        '<h2 style="margin:0 0 12px;color:#1C1C1E">Prueba de correo</h2>' +
        '<p style="font-size:14px;color:#444;line-height:1.6">Si recibiste este correo, el sistema de envío de Proposal Inc está configurado correctamente.</p>' +
        '<p style="font-size:12px;color:#888;margin-top:16px">' +
          'Fecha: ' + new Date().toLocaleString('es-MX') + '<br>' +
          'Cuota restante (MailApp): ' + MailApp.getRemainingDailyQuota() +
        '</p>' +
      '</div>' +
    '</div>';
  enviarCorreo1(para, asunto, html, []);
  Logger.log('enviarCorreoTest1: solicitud enviada a ' + para);
  Logger.log('Cuota restante de MailApp: ' + MailApp.getRemainingDailyQuota());
}
