# Datos normativos para ingesta

Coloca aquí PDFs reales del OSCE / El Peruano / Tribunal de Contrataciones, organizados por tipo.

## Estructura

```
data/normativa/
├── ley/
│   ├── 32069.pdf
│   └── 32069.json
├── reglamento/
│   ├── DS-009-2025-EF.pdf
│   └── DS-009-2025-EF.json
├── directiva/
│   ├── 008-2024-OSCE.pdf
│   └── 008-2024-OSCE.json
├── opinion/
│   ├── 023-2024-DTN.pdf
│   ├── 023-2024-DTN.json
│   ├── 045-2024-DTN.pdf
│   └── 045-2024-DTN.json
├── pronunciamiento/
│   └── ...
└── resolucion_tce/
    └── ...
```

## Formato del JSON hermano

Cada PDF requiere un `.json` con el mismo nombre. Campos:

```json
{
  "number": "Opinión N° 023-2024/DTN",
  "title": "Sobre subsanación de ofertas y experiencia del personal clave",
  "date": "2024-03-12",
  "summary": "Pronunciamiento de la DTN del OSCE respecto a la subsanación de ofertas cuando el CV del personal clave carece de firma...",
  "source_url": "https://www.gob.pe/institucion/osce/normas-legales/..."
}
```

Campos obligatorios: `number`, `title`.
Campos opcionales: `date` (YYYY-MM-DD), `summary`, `source_url`.

## Comando

```bash
npm run ingest
```

El script es **idempotente**: si un documento con el mismo `type + number` ya existe, lo skipea.

## Dónde conseguir los PDFs

| Tipo | Fuente |
| --- | --- |
| Ley N° 32069 | https://busquedas.elperuano.pe/ |
| Reglamento (DS 009-2025-EF) | https://www.gob.pe/mef/ |
| Directivas OSCE | https://www.gob.pe/osce/normatividad/directivas |
| Opiniones OSCE | https://www.gob.pe/osce/normatividad/opiniones |
| Pronunciamientos OSCE | https://www.gob.pe/osce/normatividad/pronunciamientos |
| Resoluciones TCE | https://www.gob.pe/osce/tribunal-de-contrataciones-del-estado |

## Recomendación para la demo

Apunta a un mínimo de **80 documentos** distribuidos así:
- 1 Ley (32069 completa)
- 1 Reglamento (DS 009-2025-EF completo)
- 15-20 Directivas
- 30-40 Opiniones recientes (últimos 2 años)
- 10-15 Pronunciamientos
- 20-30 Resoluciones TCE selectas (las más citadas)

**Calidad > cantidad**: 50 docs bien procesados son mejores que 200 PDFs escaneados sin OCR.
