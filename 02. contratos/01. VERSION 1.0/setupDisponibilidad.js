// setupDisponibilidad.js — Proposal Inc Sistema de Contratos v1.
// Crea las hojas DisponibilidadSafi y DisponibilidadLog en el mismo Sheets del sistema.
// Es idempotente: si una hoja ya existe, no la modifica.
// Ejecutar UNA SOLA VEZ desde Google Apps Script con la funcion instalarDisponibilidad().
// Requiere el mismo SHEET_ID usado en ScriptContratos1_v1.js.

// === Definicion de hojas ===

const CABECERAS_DISPONIBILIDAD = {
  DisponibilidadSafi: [
    'Fecha',         // YYYY-MM-DD. Clave primaria.
    'Estado',        // 'libre' | 'parcial' | 'bloqueada'
    'Nota',          // Texto libre opcional.
    'ActualizadoPor', // Nombre del usuario que hizo el ultimo cambio.
    'ActualizadoEn', // ISO timestamp del ultimo cambio.
  ],
  DisponibilidadLog: [
    'Timestamp',    // ISO timestamp del guardado.
    'Usuario',      // Nombre del usuario.
    'NumCambios',   // Número de fechas modificadas en esa sesion.
    'ResumenJSON',  // JSON con array de {fecha, estadoAnterior, estadoNuevo}.
  ],
};

// === Creacion de hojas ===

function crearHojasDisponibilidad(sheetsId) {
  const ss = SpreadsheetApp.openById(sheetsId);

  Object.keys(CABECERAS_DISPONIBILIDAD).forEach(function(nombre) {
    const cabeceras = CABECERAS_DISPONIBILIDAD[nombre];
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

function logResultadosDisponibilidad(sheetsId) {
  Logger.log('');
  Logger.log('=== SETUP DISPONIBILIDAD COMPLETADO ===');
  Logger.log('Sheets ID usado  : ' + sheetsId);
  Logger.log('DisponibilidadSafi  : OK (5 columnas)');
  Logger.log('DisponibilidadLog   : OK (4 columnas)');
  Logger.log('');
  Logger.log('Pega este SHEET_ID en la constante SHEET_ID de ScriptContratos1_v1.js si aun no lo has hecho.');
}

// === Instalador principal ===

function instalarDisponibilidad() {
  // Reemplaza este valor con el ID del Sheets del sistema (el mismo que usa ScriptContratos1_v1.js).
  const SHEET_ID = '1DaRGkVcYtpDfVnhMzX2wlcs2YTzep71NzpGSszBsYG4';

  try {
    Logger.log('Iniciando instalación del módulo de Disponibilidad...');
    crearHojasDisponibilidad(SHEET_ID);
    logResultadosDisponibilidad(SHEET_ID);
  } catch (err) {
    Logger.log('ERROR en instalarDisponibilidad(): ' + err.message + '\n' + err.stack);
    throw err;
  }
}
