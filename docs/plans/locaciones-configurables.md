# Locaciones configurables

## Meta

Permitir que Bruno agregue nuevas locaciones al sistema desde el Sheets, sin modificar código. Una locación nueva debe aparecer automáticamente en el admin, generar eventos de Calendar con la dirección correcta, y participar en el calendario de disponibilidad — todo sin intervención de un desarrollador.

Las restricciones operativas especiales (ejemplo: Isla no disponible sábados) siguen siendo código por su complejidad. Cuando llegue una locación con una restricción nueva, Bruno solicita el cambio una sola vez.

---

## Estado actual

Las locaciones están definidas en tres lugares del código:

| Lugar | Qué contiene |
|-------|-------------|
| `DIRECCIONES_LOCACION1` en el script | Nombre → dirección física para el evento de Calendar |
| Validación "Isla en sábado" | Condición `if` hardcodeada que revisa si la locación contiene "rincon" |
| `accionDisponibilidadObtener1` y `accionDisponibilidadRinconObtener1` | Un endpoint de disponibilidad por locación |

El dropdown de locación en `admin.html` también tiene las opciones escritas directamente en el HTML.

---

## Alcance de la solución

### Incluido

- Hoja `Locaciones1` en el Sheets como fuente de verdad
- El admin carga las locaciones desde esa hoja al abrir el formulario de contrato
- El portal del cliente muestra la locación correcta sin cambios
- El endpoint de disponibilidad se unifica en uno solo que recibe la locación como parámetro
- `DIRECCIONES_LOCACION1` se reemplaza por una lectura dinámica de la hoja
- La lógica de mostrar/ocultar el espacio en correos usa un campo configurable por locación (no lógica por nombre)

### No incluido

- Interfaz gráfica para gestionar locaciones (se edita directamente el Sheets)
- Restricciones operativas configurables (siguen siendo código — se agregan manualmente cuando se necesiten)
- Migración de datos históricos de disponibilidad

---

## Estructura de la hoja Locaciones1

| Columna | Ejemplo | Descripción |
|---------|---------|-------------|
| `Nombre` | Safi Metropolitan | Nombre canónico, debe coincidir exactamente con lo que se guarda en contratos |
| `Direccion` | Av. Lázaro Cárdenas 2400... | Se usa en el evento de Calendar |
| `Espacios` | Terraza Principal,Isla | Lista separada por comas de los espacios disponibles |
| `MostrarEspacio` | No | Si el espacio debe aparecer en correos al cliente (Sí/No) |
| `RestriccionEspecial` | isla-no-sabado | Clave de restricción hardcodeada en el código. Vacío si no hay restricción |
| `Activo` | Sí | Si aparece en el dropdown del admin |

---

## Archivos que se modifican

| Archivo | Cambio |
|---------|--------|
| `ScriptContratos1_v1.js` | Nueva función `obtenerLocaciones1()`. Unificar endpoints de disponibilidad. Reemplazar `DIRECCIONES_LOCACION1` por lectura dinámica. Leer `MostrarEspacio` en plantillas de correo. |
| `admin.html` | Dropdown de locación y espacios se poblan por fetch en lugar de opciones fijas |
| `setup.js` | Crear hoja `Locaciones1` con datos iniciales de Safi y Rincón |

`portal.html` y `contrato.html` no requieren cambios — usan los datos que ya devuelve el backend.

---

## Secuencia de construcción

1. Agregar hoja `Locaciones1` al Sheets con los datos actuales de Safi y Rincón
2. Escribir `obtenerLocaciones1()` en el script y reemplazar `DIRECCIONES_LOCACION1`
3. Unificar los dos endpoints de disponibilidad en uno con parámetro `locacion`
4. Actualizar `admin.html` para cargar locaciones y espacios por fetch
5. Actualizar plantillas de correo para leer `MostrarEspacio` desde el objeto locación
6. Pruebas: crear contrato con cada locación existente y verificar Calendar, correos y disponibilidad
7. Prueba de humo: agregar una locación ficticia al Sheets y verificar que aparece en el admin sin tocar código

---

## Fallos conocidos a prevenir

- Si la hoja `Locaciones1` no existe o está vacía, el admin no debe quedar inutilizable. El script debe devolver un array vacío con un log de error, no lanzar una excepción.
- El nombre de la locación en contratos existentes debe seguir funcionando aunque se renombre una locación en el Sheets — los contratos guardan el nombre como texto, no como ID.
- El endpoint de disponibilidad unificado debe ser retrocompatible con el frontend existente durante la transición.
