// setup.js. Sistema de Contratos v1 de Proposal Inc.
// Ejecutar UNA SOLA VEZ desde Google Apps Script con la funcion instalar().
// Crea la carpeta del sistema en Drive, la hoja de calculo con sus pestañas,
// puebla el catalogo v2 de paquetes y genera el template del contrato en Docs.
// El script es idempotente: si algo ya existe, no lo vuelve a crear.

// URL pública del logo PNG. Se descarga al ejecutar instalar() para incrustarlo en el template.
const LOGO_URL = 'https://proposal-inc.com/img/proposalinclogovertical-2.png';

// === Configuracion general ===

const SETUP = {
  NOMBRE_CARPETA  : 'Proposal Inc — Sistema v1.0',
  NOMBRE_SHEETS   : 'Contratos v1 — Proposal Inc',
  NOMBRE_TEMPLATE : 'Template Contrato v1 — Proposal Inc',
  EMPRESA_EMAIL   : 'proposalincmx@gmail.com',
  EMPRESA_WA      : 'https://wa.me/5218115080778',
  EMPRESA_WEB     : 'proposal-inc.com',
};

// === Definicion de hojas ===
// El orden de cada arreglo es el orden exacto de columnas en la hoja.

const CABECERAS_HOJAS = {
  Contratos1: [
    'Token','Folio','TipoContrato','NombreCliente','CorreoCliente',
    'TelefonoCliente','PaqueteClave','PaqueteNombre','AdicionalesJSON','AddonsOfrecidosJSON','Locacion',
    'EspacioLocacion','DescripcionServicio','Precio','Anticipo','SaldoPendiente',
    'Estatus','FechaCreacion','FechaEvento','HoraEvento','FechaFirma',
    'FechaUltimoAbono','FechaEntrega','FirmaBase64URL','PdfContratoUrl','EntregaDriveLink',
    'EntregaLinksExtra','CarpetaProyectoID','NotasContrato','NotasInternas','SesionCompletada',
    'RecordatorioEnviado','FotografiaLista','VideoListo','EntregaRevocada','Oculto',
    'NombrePareja','CancionEvento','FamiliaAsiste','FamiliaNumero','AlergiasAlimentarias',
    'GastosVariablesExtra','ReservacionConfirmada',
  ],
  Tokens1: ['Token','ContratoID','Tipo','Expira','Usado'],
  Abonos1: ['ID','ContratoToken','Monto','Metodo','Fecha','FechaRegistro','Notas'],
  Paquetes1: [
    'Clave','Locacion','Nombre','Precio','EsAdicional',
    'Entregables','Activo','Orden','ComponentesCombo','CostoVariable',
  ],
  Configuracion1: ['Mes','PresupuestoAnuncios'],
};

// === Catalogo inicial de paquetes (v2) ===
// 8 paquetes base + 8 add-ons individuales + 4 combos.
// CostoVariable: costo operativo interno por contrato para ese paquete o add-on.
// ComponentesCombo: claves de los add-ons que agrupa el combo, separadas por coma.
//   Vacio para paquetes base y add-ons individuales.

const PAQUETES_INICIALES = [

  // Paquetes base — Safi Metropolitan

  {
    clave: 'SAFI-MINIMALISTA', locacion: 'Safi Metropolitan', nombre: 'Safi Minimalista',
    precio: 7000, esAdicional: false, activo: true, orden: 1,
    componentesCombo: '', costoVariable: 3350,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
  },
  {
    clave: 'SAFI-CORAZON', locacion: 'Safi Metropolitan', nombre: 'Safi Corazón',
    precio: 8000, esAdicional: false, activo: true, orden: 2,
    componentesCombo: '', costoVariable: 3350,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Estructura de corazón · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
  },
  {
    clave: 'SAFI-LETRAS', locacion: 'Safi Metropolitan', nombre: 'Safi Letras "MARRY ME"',
    precio: 10000, esAdicional: false, activo: true, orden: 3,
    componentesCombo: '', costoVariable: 5350,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Letras gigantes MARRY ME · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
  },

  // Paquetes base — Rincón de Santiago

  {
    clave: 'RINCON-MINIMALISTA', locacion: 'Rincón de Santiago', nombre: 'Rincón Minimalista',
    precio: 11000, esAdicional: false, activo: true, orden: 4,
    componentesCombo: '', costoVariable: 5500,
    entregables: 'Locación privada en Santiago, N.L. · Cena romántica a tres tiempos · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
  },
  {
    clave: 'RINCON-LETRAS', locacion: 'Rincón de Santiago', nombre: 'Rincón Letras "MARRY ME"',
    precio: 14000, esAdicional: false, activo: true, orden: 5,
    componentesCombo: '', costoVariable: 9500,
    entregables: 'Locación privada en Santiago, N.L. · Cena romántica a tres tiempos · Letras gigantes MARRY ME · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
  },

  // Paquetes base — Propuestas de noviazgo

  {
    clave: 'NOV-CENA', locacion: 'Safi Metropolitan', nombre: 'Cena Romántica',
    precio: 5500, esAdicional: false, activo: true, orden: 6,
    componentesCombo: '', costoVariable: 3350,
    entregables: 'Terraza privada en Safi Metropolitan · Cena romántica a tres tiempos · Música personalizada durante la entrada',
  },
  {
    clave: 'NOV-CORAZON', locacion: 'Safi Metropolitan', nombre: 'Corazón Noviazgo',
    precio: 7000, esAdicional: false, activo: true, orden: 7,
    componentesCombo: '', costoVariable: 3350,
    entregables: 'Terraza exclusiva privada en Safi Metropolitan · Cena romántica a tres tiempos · Estructura de corazón · Música personalizada durante la entrada',
  },
  {
    clave: 'NOV-LETRAS', locacion: 'Safi Metropolitan', nombre: 'Letras Noviazgo',
    precio: 12000, esAdicional: false, activo: true, orden: 8,
    componentesCombo: '', costoVariable: 7850,
    entregables: 'Terraza exclusiva privada en Safi Metropolitan · Cena romántica a tres tiempos · Letras QUIERES SER MI NOVIA o PUEDO SER TU NOVIO · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
  },

  // Add-ons individuales

  {
    clave: 'ADD-EXPRESS', locacion: 'Todas', nombre: 'Entrega Express (24 horas)',
    precio: 2000, esAdicional: true, activo: true, orden: 9,
    componentesCombo: '', costoVariable: 0,
    entregables: 'Entrega del material editado al día siguiente del evento, en lugar del plazo estándar de 15 días hábiles',
  },
  {
    clave: 'ADD-RECUERDOS', locacion: 'Todas', nombre: 'Camino de recuerdos (30 fotos impresas)',
    precio: 1500, esAdicional: true, activo: true, orden: 10,
    componentesCombo: '', costoVariable: 550,
    entregables: '30 fotografías impresas colgadas en el camino hacia las letras o la estructura del evento',
  },
  {
    clave: 'ADD-DRONE', locacion: 'Todas', nombre: 'Video aéreo con drone',
    precio: 1500, esAdicional: true, activo: true, orden: 11,
    componentesCombo: '', costoVariable: 0,
    entregables: 'Video aéreo con drone incluido en el video cinematográfico del evento',
  },
  {
    clave: 'ADD-PETALOS', locacion: 'Todas', nombre: 'Pétalos adicionales y velas',
    precio: 1500, esAdicional: true, activo: true, orden: 12,
    componentesCombo: '', costoVariable: 500,
    entregables: 'Pétalos adicionales y velas para decoración del camino durante el evento',
  },
  {
    clave: 'ADD-TEASER', locacion: 'Todas', nombre: 'Video teaser vertical (9:16)',
    precio: 1000, esAdicional: true, activo: true, orden: 13,
    componentesCombo: '', costoVariable: 0,
    entregables: 'Video teaser vertical en formato 9:16, adicional al video cinematográfico del evento',
  },
  {
    clave: 'ADD-SAXOFON', locacion: 'Todas', nombre: 'Saxofonista en vivo',
    precio: 4500, esAdicional: true, activo: true, orden: 14,
    componentesCombo: '', costoVariable: 3000,
    // Costo base: $3,000 en Safi. En Rincon el costo es $3,500; el diferencial
    // de $500 se registra manualmente en GastosVariablesExtra del contrato.
    entregables: 'Saxofonista en vivo durante la entrada al evento',
  },
  {
    clave: 'ADD-FOTO', locacion: 'Todas', nombre: 'Fotografía profesional',
    precio: 1000, esAdicional: true, activo: true, orden: 15,
    componentesCombo: '', costoVariable: 150,
    entregables: 'Fotografía profesional del evento: galería completa editada en alta resolución',
  },
  {
    clave: 'ADD-VIDEO', locacion: 'Todas', nombre: 'Video cinematográfico',
    precio: 1500, esAdicional: true, activo: true, orden: 16,
    componentesCombo: '', costoVariable: 150,
    entregables: 'Video cinematográfico del evento',
  },

  // Combos

  {
    clave: 'COMBO-AUDIOVISUAL', locacion: 'Todas', nombre: 'Audiovisual Noviazgo',
    precio: 2200, esAdicional: true, activo: true, orden: 17,
    componentesCombo: 'ADD-FOTO,ADD-VIDEO', costoVariable: 300,
    entregables: 'Fotografía profesional + Video cinematográfico del evento',
  },
  {
    clave: 'COMBO-CINEMATOGRAFICO', locacion: 'Todas', nombre: 'Cinematográfico',
    precio: 3200, esAdicional: true, activo: true, orden: 18,
    componentesCombo: 'ADD-TEASER,ADD-DRONE,ADD-PETALOS', costoVariable: 500,
    entregables: 'Video teaser vertical + Video aéreo con drone + Pétalos adicionales y velas',
  },
  {
    clave: 'COMBO-VIP', locacion: 'Todas', nombre: 'VIP',
    precio: 3000, esAdicional: true, activo: true, orden: 19,
    componentesCombo: 'ADD-RECUERDOS,ADD-EXPRESS', costoVariable: 550,
    entregables: 'Camino de recuerdos (30 fotos impresas) + Entrega Express (24 horas)',
  },
  {
    clave: 'COMBO-TOTAL', locacion: 'Todas', nombre: 'Experiencia Total',
    precio: 5500, esAdicional: true, activo: true, orden: 20,
    componentesCombo: 'ADD-TEASER,ADD-DRONE,ADD-PETALOS,ADD-RECUERDOS,ADD-EXPRESS', costoVariable: 1050,
    entregables: 'Video teaser vertical + Video aéreo con drone + Pétalos adicionales y velas + Camino de recuerdos (30 fotos impresas) + Entrega Express (24 horas)',
  },
];

// === Helpers de Drive ===

function buscarOCrearCarpetaSetup(nombre, carpetaPadre) {
  const iter = carpetaPadre.getFoldersByName(nombre);
  if (iter.hasNext()) return iter.next();
  return carpetaPadre.createFolder(nombre);
}

// Crea la jerarquia 01. Proyectos / [Año] / [MM. Mes] dentro de la carpeta del
// sistema. Idempotente: usa buscarOCrearCarpetaSetup en cada nivel.
function crearEstructuraCarpetasProyectos(carpetaSistema) {
  const carpetaProyectos = buscarOCrearCarpetaSetup('01. Proyectos', carpetaSistema);
  const meses = [
    '01. Enero','02. Febrero','03. Marzo','04. Abril','05. Mayo','06. Junio',
    '07. Julio','08. Agosto','09. Septiembre','10. Octubre','11. Noviembre','12. Diciembre',
  ];
  const anios = ['2026','2027','2028','2029','2030','2031'];
  anios.forEach(function(anio) {
    const carpetaAnio = buscarOCrearCarpetaSetup(anio, carpetaProyectos);
    meses.forEach(function(mes) {
      buscarOCrearCarpetaSetup(mes, carpetaAnio);
    });
    Logger.log('Estructura de año creada: ' + anio);
  });
  Logger.log('Jerarquía 01. Proyectos lista. ID: ' + carpetaProyectos.getId());
}

// === Crear la carpeta del sistema en Drive ===

function crearCarpetaSistema() {
  const iter = DriveApp.getRootFolder().getFoldersByName(SETUP.NOMBRE_CARPETA);
  if (iter.hasNext()) {
    const carpeta = iter.next();
    Logger.log('Carpeta sistema: ya existe. ID: ' + carpeta.getId());
    return carpeta;
  }
  const carpeta = DriveApp.getRootFolder().createFolder(SETUP.NOMBRE_CARPETA);
  Logger.log('Carpeta sistema: creada. ID: ' + carpeta.getId());
  return carpeta;
}

// === Crear la hoja de calculo dentro de la carpeta del sistema ===

function crearSheets(carpeta) {
  const iter = carpeta.getFilesByName(SETUP.NOMBRE_SHEETS);
  if (iter.hasNext()) {
    const sheetsId = iter.next().getId();
    Logger.log('Sheets: ya existe. ID: ' + sheetsId);
    return sheetsId;
  }
  const ss   = SpreadsheetApp.create(SETUP.NOMBRE_SHEETS);
  const file = DriveApp.getFileById(ss.getId());
  carpeta.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  Logger.log('Sheets: creado. ID: ' + ss.getId());
  return ss.getId();
}

// === Crear las pestañas con sus cabeceras ===

function crearHojas(sheetsId) {
  const ss = SpreadsheetApp.openById(sheetsId);

  // Capturar las hojas existentes antes de insertar las del esquema.
  // En una hoja de calculo recien creada esto es solo la pestaña por defecto.
  const hojasPrevias = ss.getSheets();

  Object.keys(CABECERAS_HOJAS).forEach(function(nombre) {
    const cabeceras = CABECERAS_HOJAS[nombre];
    if (ss.getSheetByName(nombre)) {
      Logger.log('Hoja ' + nombre + ': ya existe, se omite.');
      return;
    }
    const hoja = ss.insertSheet(nombre);
    hoja.appendRow(cabeceras);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, cabeceras.length)
      .setFontWeight('bold')
      .setBackground('#1C1C1E')
      .setFontColor('#FAFAFA');
    Logger.log('Hoja ' + nombre + ': creada con ' + cabeceras.length + ' columnas.');
  });

  // Eliminar la pestaña por defecto. Es cualquier hoja previa que no
  // pertenezca al esquema. En una reejecución no hay ninguna y no se borra nada.
  hojasPrevias.forEach(function(h) {
    if (!CABECERAS_HOJAS[h.getName()] && ss.getSheets().length > 1) {
      Logger.log('Pestaña por defecto eliminada: ' + h.getName());
      ss.deleteSheet(h);
    }
  });
}

// === Poblar la hoja Paquetes1 con el catalogo v2 ===

function poblarPaquetes(sheetsId) {
  const ss   = SpreadsheetApp.openById(sheetsId);
  const hoja = ss.getSheetByName('Paquetes1');
  if (!hoja) throw new Error('La hoja Paquetes1 no existe. Ejecuta crearHojas() primero.');

  if (hoja.getLastRow() > 1) {
    Logger.log('Paquetes1: ya tiene datos, se omite.');
    return;
  }

  PAQUETES_INICIALES.forEach(function(p) {
    hoja.appendRow([
      p.clave,
      p.locacion,
      p.nombre,
      p.precio,
      p.esAdicional ? 'Si' : 'No',
      p.entregables,
      p.activo ? 'Si' : 'No',
      p.orden,
      p.componentesCombo,
      p.costoVariable,
    ]);
  });
  Logger.log('Paquetes1: ' + PAQUETES_INICIALES.length + ' registros insertados (catálogo v2).');
}

// === Poblar la hoja Configuracion1 con la fila inicial ===

function poblarConfiguracion(sheetsId) {
  const ss   = SpreadsheetApp.openById(sheetsId);
  const hoja = ss.getSheetByName('Configuracion1');
  if (!hoja) throw new Error('La hoja Configuracion1 no existe. Ejecuta crearHojas() primero.');

  if (hoja.getLastRow() > 1) {
    Logger.log('Configuracion1: ya tiene datos, se omite.');
    return;
  }

  // Fila inicial con el mes en curso y el presupuesto base de anuncios.
  // Bruno puede editar el monto desde el admin mes a mes.
  hoja.appendRow(['2026-05', 5500]);
  Logger.log('Configuracion1: fila inicial insertada (2026-05, $5,500).');
}

// === Crear el template del contrato en Google Docs ===

function crearTemplateContrato(carpeta) {
  const iter = carpeta.getFilesByName(SETUP.NOMBRE_TEMPLATE);
  if (iter.hasNext()) {
    const templateId = iter.next().getId();
    Logger.log('Template contrato: ya existe. ID: ' + templateId);
    return templateId;
  }

  const doc  = DocumentApp.create(SETUP.NOMBRE_TEMPLATE);
  const file = DriveApp.getFileById(doc.getId());
  carpeta.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  const body = doc.getBody();
  body.clear();

  const COLOR_DORADO   = '#C9A84C';
  const COLOR_CHARCOAL = '#1C1C1E';
  const COLOR_GRIS     = '#9B9B9F';
  const FUENTE         = 'Arial';

  // Parrafo de texto con formato.
  function parrafo(texto, alineacion, negrita, tamano, color) {
    const p = body.appendParagraph(texto);
    if (alineacion) p.setAlignment(alineacion);
    const a = {};
    a[DocumentApp.Attribute.FONT_FAMILY]      = FUENTE;
    a[DocumentApp.Attribute.FONT_SIZE]        = tamano  || 11;
    a[DocumentApp.Attribute.BOLD]             = negrita || false;
    a[DocumentApp.Attribute.FOREGROUND_COLOR] = color   || COLOR_CHARCOAL;
    p.setAttributes(a);
    return p;
  }

  // Linea divisora tenue.
  function lineaDivisora() {
    const p = body.appendParagraph('___________________________________________');
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const a = {};
    a[DocumentApp.Attribute.FONT_SIZE]        = 9;
    a[DocumentApp.Attribute.FOREGROUND_COLOR] = '#E0E0E0';
    a[DocumentApp.Attribute.SPACING_BEFORE]   = 12;
    a[DocumentApp.Attribute.SPACING_AFTER]    = 12;
    p.setAttributes(a);
  }

  // Titulo de seccion en dorado.
  function seccion(titulo) {
    const p = body.appendParagraph(titulo.toUpperCase());
    const a = {};
    a[DocumentApp.Attribute.FONT_FAMILY]      = FUENTE;
    a[DocumentApp.Attribute.FONT_SIZE]        = 9;
    a[DocumentApp.Attribute.BOLD]             = true;
    a[DocumentApp.Attribute.FOREGROUND_COLOR] = COLOR_DORADO;
    a[DocumentApp.Attribute.SPACING_BEFORE]   = 14;
    a[DocumentApp.Attribute.SPACING_AFTER]    = 4;
    p.setAttributes(a);
  }

  // Campo etiqueta mas valor o placeholder en una sola linea.
  function campo(etiqueta, valor) {
    const p  = body.appendParagraph('');
    const r1 = p.appendText(etiqueta + '  ');
    r1.setFontFamily(FUENTE);
    r1.setFontSize(9);
    r1.setBold(true);
    r1.setForegroundColor(COLOR_GRIS);
    const r2 = p.appendText(valor);
    r2.setFontFamily(FUENTE);
    r2.setFontSize(11);
    r2.setBold(false);
    r2.setForegroundColor(COLOR_CHARCOAL);
    return p;
  }

  // Clausula: titulo mas uno o varios parrafos de texto.
  function clausula(titulo, parrafos) {
    seccion(titulo);
    parrafos.forEach(function(t) {
      parrafo(t, null, false, 10, COLOR_CHARCOAL);
    });
  }

  // Encabezado con logo.
  const logoBlob = UrlFetchApp.fetch(LOGO_URL).getBlob();
  const logoImg  = body.appendImage(logoBlob);
  logoImg.setWidth(160);
  logoImg.setHeight(Math.round(160 * 512 / 944));
  body.getParagraphs()[body.getParagraphs().length - 1]
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  parrafo('Contrato de prestación de servicios',
    DocumentApp.HorizontalAlignment.CENTER, true, 14, COLOR_CHARCOAL);
  parrafo('Eventos de propuesta de matrimonio y noviazgo',
    DocumentApp.HorizontalAlignment.CENTER, false, 10, COLOR_GRIS);
  parrafo('Monterrey, Nuevo León, México',
    DocumentApp.HorizontalAlignment.CENTER, false, 10, COLOR_GRIS);

  lineaDivisora();

  // Anexo: identificacion del contrato.
  seccion('Identificación del contrato');
  campo('Folio:', '{{folio}}');
  campo('Fecha del contrato:', '{{fechaContrato}}');

  // Anexo: datos del cliente.
  seccion('Datos del cliente');
  campo('Nombre:', '{{nombre1}}');
  campo('Correo:', '{{correoCliente}}');
  campo('Teléfono:', '{{telefono}}');

  // Anexo: descripcion del servicio.
  seccion('Descripción del servicio');
  campo('Fecha del evento:', '{{fechaEvento}}');
  campo('Horario:', '{{horario}}');
  campo('Locación:', '{{locacion}}');
  campo('Dirección:', '{{locacion2}}');
  campo('Espacio:', '{{espacio}}');
  campo('Servicio contratado:', '{{descripcion}}');

  // Anexo: resumen financiero.
  seccion('Resumen financiero');
  campo('Precio total:', '{{precio}}');
  campo('Anticipo al firmar:', '{{anticipo}}');
  campo('Pago final (3 días hábiles antes del evento):', '{{restante}}');

  lineaDivisora();

  // Cuerpo del contrato.
  parrafo('Términos y condiciones del servicio',
    DocumentApp.HorizontalAlignment.CENTER, true, 13, COLOR_CHARCOAL);

  parrafo('Contrato de prestación de servicios de producción audiovisual y organización del evento que celebran por una parte Bruno Gutierrez Salazar, a quien en lo sucesivo se le denominará "EL PRESTADOR DEL SERVICIO", y por la otra {{nombre1}}, a quien en lo sucesivo se le denominará "EL CLIENTE", a quienes de manera conjunta se les denominará como "LAS PARTES", al tenor de las siguientes declaraciones y cláusulas:',
    null, false, 10, COLOR_CHARCOAL);

  seccion('Declaraciones');
  parrafo('I. Declara EL PRESTADOR DEL SERVICIO que:', null, false, 10, COLOR_CHARCOAL);
  parrafo('a) Es una persona física de nacionalidad mexicana con capacidad legal para obligarse en los términos del presente Contrato.', null, false, 10, COLOR_CHARCOAL);
  parrafo('b) Cuenta con la infraestructura, los elementos propios, los recursos técnicos y el personal capacitado para cumplir con sus obligaciones, conforme a lo establecido en el presente contrato.', null, false, 10, COLOR_CHARCOAL);
  parrafo('II. Declara EL CLIENTE que:', null, false, 10, COLOR_CHARCOAL);
  parrafo('a) Es una persona física de nacionalidad mexicana y cuenta con capacidad legal y económica para obligarse en los términos del presente contrato.', null, false, 10, COLOR_CHARCOAL);
  parrafo('En virtud de las Declaraciones anteriores, LAS PARTES convienen en obligarse conforme a las siguientes cláusulas:', null, false, 10, COLOR_CHARCOAL);

  clausula('Primera. Consentimiento', [
    'LAS PARTES manifiestan su voluntad para celebrar el presente contrato cuya naturaleza jurídica es la prestación de servicios de producción audiovisual y organización del evento; por lo que EL PRESTADOR DEL SERVICIO se obliga a prestar el servicio conforme a lo estipulado en el presente contrato y su anexo que forma parte integral del mismo, y EL CLIENTE en consecuencia, a pagar un precio cierto y determinado.',
  ]);

  clausula('Segunda. Objeto', [
    'El objeto del presente contrato es la prestación de servicios de producción audiovisual y organización del evento, cuyas características y costos se señalan en el ANEXO que forma parte integral del mismo. EL PRESTADOR DEL SERVICIO deberá utilizar todos sus conocimientos técnicos, equipo y materiales adecuados para la mejor realización del servicio solicitado, a fin de obtener resultados óptimos.',
  ]);

  clausula('Tercera. Precio del servicio', [
    'LAS PARTES manifiestan su conformidad en que el precio total a pagar por EL CLIENTE, como contraprestación de los servicios contratados, es el señalado en el ANEXO del presente contrato, el cual forma parte integral del mismo.',
  ]);

  clausula('Cuarta. Forma y lugar de pago', [
    'Al momento de la firma del presente contrato EL CLIENTE deberá pagar por concepto de anticipo la cantidad que se indica en el ANEXO de este contrato, y el saldo restante en la fecha acordada por LAS PARTES antes de la fecha del evento.',
    'EL CLIENTE efectuará el pago pactado en los términos y condiciones acordados, pudiendo ser en efectivo o mediante transferencia bancaria.',
    'El servicio deberá estar pagado en su totalidad a más tardar tres días hábiles antes del evento.',
  ]);

  clausula('Quinta. Lugar y horario para la prestación del servicio', [
    'El lugar, día y hora en que se llevará a cabo el servicio son los señalados en el ANEXO del presente contrato.',
  ]);

  clausula('Sexta. Preparación del evento', [
    'EL PRESTADOR DEL SERVICIO será el responsable de la decoración, música e iluminación adecuada del lugar, de acuerdo al servicio contratado.',
  ]);

  clausula('Séptima. Cambio de horario y cancelación', [
    'En caso de cualquier cambio de horario, EL CLIENTE deberá notificarlo a EL PRESTADOR DEL SERVICIO con al menos siete días naturales de anticipación a la fecha del evento, sujeto a la disponibilidad de EL PRESTADOR DEL SERVICIO.',
    'EL CLIENTE tendrá derecho a un único reagendamiento, el cual deberá ejercerse antes de la fecha original del evento. La nueva fecha deberá acordarse dentro de los seis meses siguientes a la fecha original y estará sujeta a la disponibilidad de EL PRESTADOR DEL SERVICIO. Transcurrido ese plazo sin que EL CLIENTE haya fijado una nueva fecha, el contrato quedará sin efecto y los pagos realizados no serán reembolsables.',
    'En caso de probabilidad de lluvia igual o superior al 30% según el pronóstico oficial, EL CLIENTE podrá solicitar el reagendamiento hasta 48 horas antes del evento sin que ello consuma el único reagendamiento permitido. Será responsabilidad de EL CLIENTE la revisión del pronóstico del clima. Si EL CLIENTE decide continuar con el evento bajo esas condiciones, acepta que este podrá estar sujeto a ajustes operativos, incluyendo la omisión del drone, la realización de la cena en interiores o el uso de locaciones alternas para el montaje, sin que dichos ajustes constituyan un incumplimiento por parte de EL PRESTADOR DEL SERVICIO. No procederá ninguna cancelación ni reagendamiento posterior a las 48 horas previas al evento.',
    'En ningún caso procederá la devolución de los pagos realizados por EL CLIENTE, independientemente del motivo o la anticipación con que se solicite la cancelación.',
    'Si EL CLIENTE no se presenta el día y hora del evento sin aviso previo, se perderá el derecho al reagendamiento y a cualquier devolución.',
    'En caso de que EL PRESTADOR DEL SERVICIO cancele el evento por causas imputables a él, deberá devolver a EL CLIENTE la totalidad de los pagos recibidos en un plazo no mayor a diez días hábiles, o bien ofrecer una nueva fecha sin penalidad para EL CLIENTE, a elección de este último.',
    'En caso de que EL PRESTADOR DEL SERVICIO se vea imposibilitado para cumplir por causas de fuerza mayor debidamente justificadas y ajenas a su voluntad, ofrecerá a EL CLIENTE una nueva fecha dentro de los seis meses siguientes. Si EL CLIENTE no acepta la nueva fecha, se le devolverá la totalidad de los pagos realizados en un plazo no mayor a diez días hábiles.',
  ]);

  clausula('Octava. Duración', [
    'La duración del servicio será la acordada previamente por LAS PARTES, y el tiempo comenzará a correr a partir de la hora señalada en el ANEXO. EL CLIENTE deberá llegar puntualmente a la hora reservada.',
    'Habrá un tiempo de tolerancia de 10 minutos para EL CLIENTE. Transcurrido ese tiempo, EL PRESTADOR DEL SERVICIO no estará obligado a cumplir con el servicio contratado. De común acuerdo, podrá ofrecerse una extensión de tiempo en bloques de 40 minutos, con un costo de $2,000 MXN por bloque adicional.',
  ]);

  clausula('Novena. Entrega del material', [
    'EL PRESTADOR DEL SERVICIO se obliga a entregar el material audiovisual resultado del servicio en un periodo no mayor a 15 días hábiles a partir del día siguiente al evento, por medio de una carpeta en almacenamiento en la nube. Se enviará a EL CLIENTE un vínculo de descarga con el cual tendrá acceso a su material.',
    'En caso de que EL CLIENTE haya contratado el servicio de Entrega Express, el material será entregado en un plazo no mayor a 24 horas contadas a partir de la conclusión del evento.',
  ]);

  clausula('Décima. Almacenaje', [
    'En caso de que EL CLIENTE no descargue el material en la fecha señalada, transcurridos 14 días naturales posteriores a la fecha de entrega, EL PRESTADOR DEL SERVICIO no se hará responsable del almacenaje del material audiovisual.',
  ]);

  clausula('Décima primera. Obligaciones de las partes', [
    'Con base en lo estipulado en el presente Contrato, LAS PARTES se obligan a:',
    'EL PRESTADOR DEL SERVICIO:',
    'a) Cumplir con lo establecido en el presente Contrato.',
    'b) Informar a EL CLIENTE los precios, condiciones y características del servicio contratado.',
    'c) Entregar el material audiovisual en la fecha señalada conforme a lo establecido en este Contrato.',
    'EL CLIENTE:',
    'a) Cumplir con lo establecido en el presente Contrato.',
    'b) Realizar los pagos conforme a lo pactado en el presente Contrato.',
    'c) Presentarse en el lugar del evento el día y hora señalados en el ANEXO.',
  ]);

  clausula('Décima segunda. Causas de rescisión', [
    'Son causas de rescisión del presente Contrato:',
    'a) Que EL PRESTADOR DEL SERVICIO no cumpla con la entrega de material por causas imputables a él.',
    'b) Que EL CLIENTE no realice los pagos de conformidad a lo establecido en el presente contrato a menos de dos días hábiles del evento.',
    'c) Que EL CLIENTE no realice el pago del anticipo necesario para hacer la reservación del evento a más tardar dos días después de la fecha del envío del contrato.',
  ]);

  clausula('Décima tercera. Pena convencional', [
    'El incumplimiento de cualquiera de las obligaciones establecidas en el presente Contrato generará las consecuencias señaladas en las cláusulas correspondientes, las cuales las partes aceptan expresamente como pena convencional.',
  ]);

  clausula('Décima cuarta. Locación', [
    'La locación, decoración, iluminación, música y cena serán responsabilidad de EL PRESTADOR DEL SERVICIO de acuerdo al paquete contratado por EL CLIENTE y a lo señalado en el ANEXO.',
  ]);

  clausula('Décima quinta. Uso del material audiovisual', [
    'EL PRESTADOR DEL SERVICIO podrá utilizar el material audiovisual obtenido como resultado del servicio con fines publicitarios, de difusión, de promoción o para redes sociales, salvo que EL CLIENTE manifieste su negativa de forma expresa al momento de la firma del presente Contrato.',
  ]);

  clausula('Décima sexta. Protección de datos personales', [
    'Los datos personales recabados en el presente Contrato (nombre, correo electrónico y teléfono) serán utilizados exclusivamente para la ejecución del servicio contratado, el envío de comunicaciones relacionadas con el evento y el cumplimiento de las obligaciones derivadas de este Contrato. Dichos datos podrán ser compartidos únicamente con la locación del evento, en la medida estrictamente necesaria para la coordinación del servicio.',
    'Los datos serán conservados en los sistemas de Proposal Inc hasta que EL CLIENTE solicite expresamente su eliminación, mediante comunicación escrita dirigida a proposalincmx@gmail.com. EL CLIENTE podrá en cualquier momento ejercer sus derechos de acceso, rectificación, cancelación u oposición conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, a través del mismo medio.',
  ]);

  clausula('Décima séptima. Material entregado y música del evento', [
    'El material audiovisual entregado se considera definitivo. EL CLIENTE tendrá derecho a solicitar un único ajuste menor, como el corte de una sección o una modificación ligera al montaje, dentro de los cinco días naturales posteriores a la fecha de entrega del vínculo de descarga. Transcurrido ese plazo, o una vez aplicado el ajuste, la entrega quedará cerrada. No se realizarán nuevas tomas ni regrabaciones como parte de este servicio.',
    'La música utilizada durante la entrada al evento será la que EL CLIENTE indique previamente. En caso de que EL CLIENTE no especifique una canción, EL PRESTADOR DEL SERVICIO seleccionará la música a su criterio, sin que ello constituya un incumplimiento del servicio.',
  ]);

  clausula('Décima octava. Información previa al evento', [
    'EL CLIENTE proporcionará la información necesaria para la organización del evento al momento de la firma del presente Contrato. Cualquier modificación a dicha información, incluyendo cambios en la canción del evento, número de invitados o alergias alimentarias, deberá notificarse a EL PRESTADOR DEL SERVICIO con al menos 48 horas de anticipación a la fecha del evento. Transcurrido ese plazo, EL PRESTADOR DEL SERVICIO procederá con la información registrada al momento de la firma, sin que los resultados derivados de datos desactualizados constituyan un incumplimiento del servicio.',
  ]);

  clausula('Décima novena. Restricciones de la locación', [
    'EL CLIENTE y sus acompañantes deberán respetar en todo momento las reglas del establecimiento donde se lleve a cabo el evento. En caso de que su incumplimiento derive en la suspensión o interrupción del evento por parte del establecimiento, EL PRESTADOR DEL SERVICIO no será responsable y no procederá devolución ni reagendamiento.',
  ]);

  lineaDivisora();

  // Bloque de aceptacion y firma.
  seccion('Aceptación y firma');
  parrafo('Al firmar este documento declaro que he leído y acepto en su totalidad los términos y condiciones establecidos en las cláusulas anteriores.',
    DocumentApp.HorizontalAlignment.CENTER, false, 11, COLOR_CHARCOAL);

  const espacioFirma = body.appendParagraph('');
  const aEspacioFirma = {};
  aEspacioFirma[DocumentApp.Attribute.SPACING_AFTER] = 28;
  espacioFirma.setAttributes(aEspacioFirma);

  // Marcador de firma. ScriptContratos1 reemplaza este texto con la imagen de la firma del cliente.
  const pFirma = body.appendParagraph('{{firma}}');
  pFirma.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const aFirma = {};
  aFirma[DocumentApp.Attribute.FONT_FAMILY]      = FUENTE;
  aFirma[DocumentApp.Attribute.FONT_SIZE]        = 11;
  aFirma[DocumentApp.Attribute.FOREGROUND_COLOR] = '#CCCCCC';
  pFirma.setAttributes(aFirma);

  const pEspacio = body.appendParagraph('');
  const aEspacio = {};
  aEspacio[DocumentApp.Attribute.SPACING_AFTER] = 8;
  pEspacio.setAttributes(aEspacio);

  campo('EL CLIENTE:', '{{nombre1}}');
  campo('Fecha de firma:', '{{fechaContrato}}');

  const pEspacio2 = body.appendParagraph('');
  pEspacio2.setAttributes(aEspacio);

  campo('EL PRESTADOR DEL SERVICIO:', 'Bruno Gutierrez Salazar');

  lineaDivisora();

  // Pie de pagina.
  parrafo('Proposal Inc · Monterrey, Nuevo León, México',
    DocumentApp.HorizontalAlignment.CENTER, false, 9, COLOR_GRIS);
  parrafo(SETUP.EMPRESA_EMAIL + ' · ' + SETUP.EMPRESA_WEB,
    DocumentApp.HorizontalAlignment.CENTER, false, 9, COLOR_GRIS);

  const templateId = doc.getId();
  doc.saveAndClose();
  Logger.log('Template contrato: creado. ID: ' + templateId);
  return templateId;
}

// === Log final con los IDs generados ===

function logResultados(idCarpeta, idSheets, idTemplate) {
  Logger.log('');
  Logger.log('=== SETUP v1 DE PROPOSAL INC COMPLETADO ===');
  Logger.log('Carpeta sistema  : OK. ID: ' + idCarpeta);
  Logger.log('Sheets           : OK. ID: ' + idSheets);
  Logger.log('Paquetes1        : OK (' + PAQUETES_INICIALES.length + ' registros — catálogo v2)');
  Logger.log('Configuracion1   : OK (fila inicial 2026-05 / $5,500)');
  Logger.log('Template contrato: OK. ID: ' + idTemplate);
  Logger.log('');
  Logger.log('ANOTA ESTOS TRES IDs. Se usan en CONFIG1 de ScriptContratos1_v1.js:');
  Logger.log('');
  Logger.log('CARPETA_SISTEMA_ID   = ' + idCarpeta);
  Logger.log('SHEET_ID             = ' + idSheets);
  Logger.log('TEMPLATE_CONTRATO_ID = ' + idTemplate);
  Logger.log('');
  Logger.log('Copia estos tres valores al chat para verificarlos y anotarlos en el ContextoMaster.');
}

// === Instalador principal. Esta es la funcion que se ejecuta. ===

function instalar() {
  try {
    Logger.log('Iniciando instalación del Sistema de Contratos v1 de Proposal Inc...');
    const carpeta    = crearCarpetaSistema();
    const sheetsId   = crearSheets(carpeta);
    crearHojas(sheetsId);
    poblarPaquetes(sheetsId);
    poblarConfiguracion(sheetsId);
    crearEstructuraCarpetasProyectos(carpeta);
    const idTemplate = crearTemplateContrato(carpeta);
    logResultados(carpeta.getId(), sheetsId, idTemplate);
  } catch (err) {
    Logger.log('ERROR en instalar(): ' + err.message + '\n' + err.stack);
    throw err;
  }
}
