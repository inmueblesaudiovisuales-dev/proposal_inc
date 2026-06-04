// setupRincon.js — Proposal Inc Sistema de Contratos v1.
// Crea las hojas DisponibilidadRincon y DisponibilidadRinconLog en el mismo Sheets del sistema.
// Es idempotente: si una hoja ya existe, no la modifica.
// Ejecutar UNA SOLA VEZ desde Google Apps Script con la funcion instalarRincon().
// Requiere el mismo SHEET_ID usado en ScriptContratos1_v1.js.

// === Definicion de hojas ===

const CABECERAS_RINCON = {
  DisponibilidadRincon: [
    'Fecha',          // YYYY-MM-DD. Clave primaria.
    'Estado',         // 'libre' | 'parcial' | 'bloqueada'
    'Nota',           // Espacios libres separados por coma cuando estado es parcial.
    'ActualizadoPor', // Nombre del usuario que hizo el ultimo cambio.
    'ActualizadoEn',  // ISO timestamp del ultimo cambio.
  ],
  DisponibilidadRinconLog: [
    'Timestamp',    // ISO timestamp del guardado.
    'Usuario',      // Nombre del usuario.
    'NumCambios',   // Numero de fechas modificadas en esa sesion.
    'ResumenJSON',  // JSON con array de {fecha, estadoAnterior, estadoNuevo}.
  ],
};

// === Creacion de hojas ===

function crearHojasRincon(sheetsId) {
  const ss = SpreadsheetApp.openById(sheetsId);

  Object.keys(CABECERAS_RINCON).forEach(function(nombre) {
    const cabeceras = CABECERAS_RINCON[nombre];
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
}

// === Log final ===

function logResultadosRincon(sheetsId) {
  Logger.log('');
  Logger.log('=== SETUP RINCON COMPLETADO ===');
  Logger.log('Sheets ID usado         : ' + sheetsId);
  Logger.log('DisponibilidadRincon    : OK (5 columnas)');
  Logger.log('DisponibilidadRinconLog : OK (4 columnas)');
  Logger.log('');
  Logger.log('Ya puedes desplegar ScriptContratos1_v1.js con las funciones de Rincon.');
}

// === Instalador principal ===

function instalarRincon() {
  const SHEET_ID = '1DaRGkVcYtpDfVnhMzX2wlcs2YTzep71NzpGSszBsYG4';

  try {
    Logger.log('Iniciando instalacion del modulo de Disponibilidad Rincon...');
    crearHojasRincon(SHEET_ID);
    logResultadosRincon(SHEET_ID);
  } catch (err) {
    Logger.log('ERROR en instalarRincon(): ' + err.message + '\n' + err.stack);
    throw err;
  }
}
