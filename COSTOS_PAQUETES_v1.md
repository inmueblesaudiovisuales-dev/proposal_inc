# Costos de paquetes y add-ons (CostoVariable)

*Información proporcionada por el dueño el 4 de junio de 2026. Sirve para poblar la columna `CostoVariable` de la hoja `Paquetes1`, que el panel financiero usa para calcular el margen de cada evento.*

> Cómo capturarlo: en el panel de admin, sección Paquetes, editar cada paquete y escribir el número en el campo de costo (CostoVariable). No requiere tocar código.

## Paquetes base

| Paquete (nombre actual) | Precio al cliente | CostoVariable | Desglose |
|---|---|---|---|
| Safi Esencial | $7,000 | $3,700 | $3,200 reservar + $300 pétalos + $200 estacionamiento |
| Safi Corazón | $8,000 | $3,700 | mismo base (el corazón es propio, no cuesta) |
| Safi Letras | $10,000 | $5,700 | $3,700 base + $2,000 letras MARRY ME |
| Rincón Esencial | $11,000 | $5,900 | $5,200 reservar + $500 gasolina + $200 pétalos |
| Rincón Letras | $14,000 | $9,900 | $5,900 base + $4,000 letras MARRY ME |
| Cena Romántica (noviazgo) | $5,500 | $3,700 | mismo base que Safi Esencial |
| Corazón Noviazgo | $7,000 | $3,700 | mismo base (el corazón es propio) |
| Letras Noviazgo | $12,000 | $8,200 | $3,700 base + $4,500 letras (son más letras) |

## Add-ons

| Add-on | Precio al cliente | CostoVariable | Nota |
|---|---|---|---|
| Camino de recuerdos | $1,500 | $300 | impresión de las 30 fotos |
| Pétalos adicionales y velas | $1,000 | $300 | |
| Saxofonista en vivo | $4,500 | $3,000 | en Rincón cuesta $500 más; ese diferencial se captura en GastosVariablesExtra del contrato |
| Entrega Express | $2,000 | $0 | lo hace el equipo |
| Video teaser vertical | $1,000 | $0 | lo hace el equipo |
| Video con drone | $1,500 | $0 | lo hace el equipo |

## Precios a corregir en el admin (confirmado: el flyer es el precio actual)

El precio que se cobra al cliente sale de la hoja Paquetes1 (se edita en el admin),
no del codigo. Estos 4 precios en el sistema estan viejos y hay que actualizarlos al
valor del flyer para no cobrar de mas:

| Item en el admin | Componentes | Precio viejo (sistema) | Precio correcto (flyer) |
|---|---|---|---|
| Combo "Drone + Ambiente" | Drone + Pétalos + Teaser vertical | $3,200 | **$2,000** |
| Combo "Camino de recuerdos + Entrega Express" | Recuerdos + Express | $3,000 | **$2,500** |
| Combo "Todo Incluido" | Drone + Pétalos + Teaser + Recuerdos + Express | $5,500 | **$3,000** |
| Add-on "Pétalos adicionales y velas" | (individual) | $1,500 | **$1,000** |

Los demas add-ons del flyer (Camino de recuerdos $1,500, Entrega Express $2,000,
Video teaser $1,000, Video con drone $1,500, Saxofonista $4,500) ya coinciden.

## Notas para tener en cuenta

- **El panel financiero usa el CostoVariable del paquete base**, no suma automáticamente el costo de los add-ons. Por eso, cuando un contrato lleve saxofonista (que sí cuesta $3,000), conviene registrar ese costo en el campo "Gastos variables" del contrato para que el margen quede real.
- **Foto y video** ya vienen incluidos en todos los paquetes y no cuestan extra (los hace el equipo).
- **Combo y add-ons de Foto/Video:** en el flyer ya no aparecen el combo "Audiovisual" (Foto+Video) ni los add-ons individuales de Fotografía y Video, porque ya vienen incluidos en todos los paquetes. Si en el admin siguen activos, conviene desactivarlos para que no se ofrezcan por separado. (Pendiente de confirmar por el dueño.)
