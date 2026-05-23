// actualizarPaquetes_v2.js
// Migra el catalogo de Paquetes1 al modelo v2: paquetes base + add-ons a la carta + combos.
// Agregar este archivo al mismo proyecto de Apps Script que ScriptContratos1_v1.js.
// Ejecutar la funcion actualizarPaquetesV2() UNA SOLA VEZ.
// PRECAUCION: borra todas las filas de datos de Paquetes1 y las reemplaza.

const PAQUETES_V2 = [
  // ── Pedidas de mano en Safi Metropolitan ──
  {
    clave: 'SAFI-MINIMALISTA', locacion: 'Safi Metropolitan', nombre: 'Safi Minimalista',
    precio: 7000, esAdicional: false, activo: true, orden: 1,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
    componentesCombo: '',
  },
  {
    clave: 'SAFI-CORAZON', locacion: 'Safi Metropolitan', nombre: 'Safi Corazón',
    precio: 8000, esAdicional: false, activo: true, orden: 2,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Estructura de corazón con letrero ¿Quieres casarte conmigo? · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
    componentesCombo: '',
  },
  {
    clave: 'SAFI-LETRAS', locacion: 'Safi Metropolitan', nombre: 'Safi Letras MARRY ME',
    precio: 10000, esAdicional: false, activo: true, orden: 3,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Letras gigantes MARRY ME · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
    componentesCombo: '',
  },
  // ── Pedidas de mano en Rincón de Santiago ──
  {
    clave: 'RINCON-MINIMALISTA', locacion: 'Rincón de Santiago', nombre: 'Rincón Minimalista',
    precio: 11000, esAdicional: false, activo: true, orden: 4,
    entregables: 'Locación privada · Cena romántica a tres tiempos · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
    componentesCombo: '',
  },
  {
    clave: 'RINCON-LETRAS', locacion: 'Rincón de Santiago', nombre: 'Rincón Letras MARRY ME',
    precio: 14000, esAdicional: false, activo: true, orden: 5,
    entregables: 'Locación privada · Cena romántica a tres tiempos · Letras gigantes MARRY ME · Fotografía profesional · Video cinematográfico · Música personalizada durante la entrada',
    componentesCombo: '',
  },
  // ── Propuestas de noviazgo ──
  {
    clave: 'NOV-CENA', locacion: 'Safi Metropolitan', nombre: 'Cena Romántica',
    precio: 5500, esAdicional: false, activo: true, orden: 6,
    entregables: 'Terraza techada semi-privada · Cena romántica a tres tiempos · Decoración de mesa · Letrero personalizado',
    componentesCombo: '',
  },
  {
    clave: 'NOV-CORAZON', locacion: 'Safi Metropolitan', nombre: 'Corazón Noviazgo',
    precio: 7000, esAdicional: false, activo: true, orden: 7,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Estructura de corazón con letrero ¿Quieres ser mi novia?',
    componentesCombo: '',
  },
  {
    clave: 'NOV-LETRAS', locacion: 'Safi Metropolitan', nombre: 'Letras Noviazgo',
    precio: 12000, esAdicional: false, activo: true, orden: 8,
    entregables: 'Terraza exclusiva privada · Cena romántica a tres tiempos · Letras QUIERES SER MI NOVIA o PUEDO SER TU NOVIO · Fotografía profesional · Video cinematográfico',
    componentesCombo: '',
  },
  // ── Add-ons individuales ──
  {
    clave: 'ADD-EXPRESS', locacion: 'Todas', nombre: 'Entrega Express (24 horas)',
    precio: 2000, esAdicional: true, activo: true, orden: 9,
    entregables: 'Entrega del material editado al día siguiente del evento, en lugar del plazo estándar de 15 días hábiles',
    componentesCombo: '',
  },
  {
    clave: 'ADD-RECUERDOS', locacion: 'Todas', nombre: 'Camino de recuerdos (30 fotos)',
    precio: 1500, esAdicional: true, activo: true, orden: 10,
    entregables: '30 fotografías impresas colgadas en el camino hacia las letras o la estructura del evento',
    componentesCombo: '',
  },
  {
    clave: 'ADD-DRONE', locacion: 'Todas', nombre: 'Video aéreo con drone',
    precio: 1500, esAdicional: true, activo: true, orden: 11,
    entregables: 'Toma aérea cinematográfica con drone integrada al video del evento',
    componentesCombo: '',
  },
  {
    clave: 'ADD-PETALOS', locacion: 'Todas', nombre: 'Pétalos adicionales y velas',
    precio: 1500, esAdicional: true, activo: true, orden: 12,
    entregables: 'Ambientación extra con pétalos adicionales y velas decorativas en el espacio del evento',
    componentesCombo: '',
  },
  {
    clave: 'ADD-TEASER', locacion: 'Todas', nombre: 'Video teaser vertical (9:16)',
    precio: 1000, esAdicional: true, activo: true, orden: 13,
    entregables: 'Video corto editado en formato vertical (9:16) para redes sociales, entregado junto al video principal',
    componentesCombo: '',
  },
  {
    clave: 'ADD-SAXOFON', locacion: 'Todas', nombre: 'Saxofonista en vivo',
    precio: 4500, esAdicional: true, activo: true, orden: 14,
    entregables: 'Presentación en vivo de saxofonista durante la entrada al evento',
    componentesCombo: '',
  },
  {
    clave: 'ADD-FOTO', locacion: 'Todas', nombre: 'Fotografía profesional',
    precio: 1000, esAdicional: true, activo: true, orden: 15,
    entregables: 'Sesión fotográfica profesional completa del evento',
    componentesCombo: '',
  },
  {
    clave: 'ADD-VIDEO', locacion: 'Todas', nombre: 'Video cinematográfico',
    precio: 1500, esAdicional: true, activo: true, orden: 16,
    entregables: 'Video cinematográfico completo del evento',
    componentesCombo: '',
  },
  // ── Combos ──
  {
    clave: 'COMBO-AUDIOVISUAL', locacion: 'Todas', nombre: 'Combo Audiovisual',
    precio: 2200, esAdicional: true, activo: true, orden: 17,
    entregables: 'Fotografía profesional + Video cinematográfico. Ahorro de $300 respecto a contratarlos por separado.',
    componentesCombo: 'ADD-FOTO,ADD-VIDEO',
  },
  {
    clave: 'COMBO-CINEMATOGRAFICO', locacion: 'Todas', nombre: 'Combo Cinematográfico',
    precio: 3200, esAdicional: true, activo: true, orden: 18,
    entregables: 'Video teaser vertical (9:16) + Video aéreo con drone + Pétalos adicionales y velas. Ahorro de $800 respecto a contratarlos por separado.',
    componentesCombo: 'ADD-TEASER,ADD-DRONE,ADD-PETALOS',
  },
  {
    clave: 'COMBO-VIP', locacion: 'Todas', nombre: 'Combo VIP',
    precio: 3000, esAdicional: true, activo: true, orden: 19,
    entregables: 'Camino de recuerdos (30 fotos) + Entrega Express (24 horas). Ahorro de $500 respecto a contratarlos por separado.',
    componentesCombo: 'ADD-RECUERDOS,ADD-EXPRESS',
  },
  {
    clave: 'COMBO-TOTAL', locacion: 'Todas', nombre: 'Combo Experiencia Total',
    precio: 5500, esAdicional: true, activo: true, orden: 20,
    entregables: 'Video teaser vertical (9:16) + Video aéreo con drone + Pétalos adicionales y velas + Camino de recuerdos (30 fotos) + Entrega Express (24 horas). Ahorro de $1,500 respecto a contratarlos por separado.',
    componentesCombo: 'ADD-TEASER,ADD-DRONE,ADD-PETALOS,ADD-RECUERDOS,ADD-EXPRESS',
  },
];

function actualizarPaquetesV2() {
  const ss   = SpreadsheetApp.openById(CONFIG1.SHEET_ID);
  const hoja = ss.getSheetByName('Paquetes1');
  if (!hoja) throw new Error('No se encontró la hoja Paquetes1.');

  // Agregar columna ComponentesCombo si todavia no existe.
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const tieneCombo  = encabezados.indexOf('ComponentesCombo') !== -1;
  if (!tieneCombo) {
    const colNueva = hoja.getLastColumn() + 1;
    hoja.getRange(1, colNueva).setValue('ComponentesCombo');
    hoja.getRange(1, colNueva)
        .setFontWeight('bold')
        .setBackground('#1C1C1E')
        .setFontColor('#FAFAFA');
    Logger.log('Columna ComponentesCombo agregada en la columna ' + colNueva + '.');
  } else {
    Logger.log('Columna ComponentesCombo ya existe. Se omite la creacion.');
  }

  // Borrar todas las filas de datos. La fila 1 (encabezados) se conserva.
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila > 1) {
    hoja.deleteRows(2, ultimaFila - 1);
    Logger.log('Filas eliminadas: ' + (ultimaFila - 1) + '.');
  }

  // Insertar el catalogo v2.
  PAQUETES_V2.forEach(function(p) {
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
    ]);
  });

  const bases    = PAQUETES_V2.filter(function(p) { return !p.esAdicional; }).length;
  const addons   = PAQUETES_V2.filter(function(p) { return p.esAdicional && !p.componentesCombo; }).length;
  const combos   = PAQUETES_V2.filter(function(p) { return !!p.componentesCombo; }).length;

  Logger.log('actualizarPaquetesV2 completado.');
  Logger.log('  Paquetes base : ' + bases);
  Logger.log('  Add-ons       : ' + addons);
  Logger.log('  Combos        : ' + combos);
  Logger.log('  Total         : ' + PAQUETES_V2.length);
}
