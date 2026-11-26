---
name: levantar-observaciones
description: Flujo para levantar un documento de observaciones o respuestas de César (el experto de dominio): leerlo, separar cada observación, ubicarla en el código, corregirla, probarla y dejar el commit con el formato del repo. Úsala cuando el usuario diga "observaciones del documento N", "respuestas de César", "lo que mandó César", pegue un .docx/.md/.pdf con correcciones, o pida aplicar un lote de correcciones de cliente.
---

# Levantar observaciones de César

César revisa A-LexIA como abogado especialista en contrataciones y manda
documentos numerados (doc 10, 13, 14, 15…) con observaciones, capturas y
respuestas a preguntas nuestras. Cada observación es una regla jurídica o de
forma: hay que cumplirla al pie de la letra y dejar rastro de su origen.

## 1. Inventario antes de tocar código

1. Lee el documento completo (usa la skill `pdf` o `docx` si hace falta; los
   .docx de César se pueden pasar a texto con `scripts/pdf-a-word.ps1` /
   `mammoth`).
2. Haz una lista numerada: una fila por observación, con
   - la cita textual corta de César,
   - el módulo (chat, biblioteca, generador, evaluador, ejecución, planes, voz…),
   - si es **regla** (cambia el resultado) o **forma** (texto, orden, Word),
   - si es ambigua → va a preguntas, no se inventa.
3. Muestra la lista al usuario si hay más de ~5 observaciones o alguna ambigua.
   Las dudas se acumulan en `docs/preguntas-para-cesar-*.md` con el estilo de
   ese archivo (qué necesitamos, por qué, qué hacemos mientras).

## 2. Ubicar cada observación

- Busca primero si ya hay una regla de César sobre lo mismo:
  `grep -rn "César" src/lib/<módulo>` — las reglas llevan comentario con fecha.
  Si la nueva contradice una vieja, pregunta cuál manda; no borres la vieja en
  silencio.
- Rutas habituales:
  - Evaluador: `src/lib/evaluacion/` (factor → `factores.ts`, `experiencia.ts`,
    `personal.ts`, `precio.ts`, `plazo.ts`, `certificaciones.ts`; acta →
    `acta.ts`; procedimiento → `procedimiento.ts`).
  - Generador de requerimientos: `src/lib/generadores/plantillas/<tipo>.ts` y
    `comunes.ts`. Texto literal de los formatos: compruébalo con
    `npx tsx scripts/auditar-plantilla-requerimiento.ts`.
  - Chat y biblioteca: ver skill `cambio-en-el-chat`.
  - Ejecución contractual: `src/lib/ejecucion/`.
  - Planes y créditos: `src/lib/billing/` + migración (skill `migracion-supabase`).
- Si la observación es "el modelo responde X", decide si se arregla **por
  código** (regla determinista: montos, plazos, códigos ISO, cuadrar letras con
  números) o **por prompt**. Por código siempre que se pueda: el modelo no es
  determinista.

## 3. Corregir

- Comentario junto al cambio: qué regla, de dónde viene y el caso que la
  motivó, p. ej.
  `// El pago acreditado solo con el SIAF no se computa (César, doc 15, 17/10/2026).`
- No mezcles refactors con observaciones: el diff debe poder revisarse contra
  el documento.

## 4. Probar

- Si hay caso real (una oferta, unas bases, una pregunta), conviértelo en
  prueba en `scripts/pruebas/` (skill `prueba-de-script`). Existen precedentes:
  `doc15.ts`, `reglas-respuestas-cesar.ts`, `modelos-de-cesar.ts`.
- Corre `npm run typecheck` y las pruebas del módulo tocado.
- Para cambios de prompt del chat, mide antes/después
  (`scripts/medir-respuestas-chat.ts`), no te fíes de una corrida.

## 5. Cerrar

- Tabla final para el usuario: observación → archivo(s) → estado
  (hecho / pregunta pendiente / no aplica y por qué).
- Commit con el formato del repo (solo si el usuario lo pide):

```
feat: observaciones del documento 16 — <3-5 cosas que nota el usuario>

<Módulo> (<caso o expediente si lo hay>):
- <regla en lenguaje del usuario> (<archivo.ts>).
- ...

Respuestas de César al documento 16:
- ...
```
