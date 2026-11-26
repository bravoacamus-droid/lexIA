---
name: migracion-supabase
description: Cómo crear y aplicar una migración SQL en A-LexIA (numeración NNNN, apply-migration.ts, RLS, grants por columna, funciones SECURITY DEFINER, verificación). Úsala antes de crear o cambiar tablas, columnas, políticas RLS, funciones RPC, índices o buckets de Storage en este repo, y al revisar una migración.
---

# Migraciones de Supabase en A-LexIA

Complementa a las skills externas `supabase` y `supabase-postgres-best-practices`
(léelas para reglas generales). Aquí manda lo propio del repo.

## Archivo

- `supabase/migrations/NNNN_nombre_en_espanol.sql`, con el siguiente número
  libre: `ls supabase/migrations | tail -3`. (Faltan 0046 y 0084: no los
  reutilices.) No uses `supabase migration new`: este repo numera a mano.
- Cabecera de comentario: qué cambia, **por qué** (caso, documento de César) y
  si hay que correr algo después (backfill, reindex).
- Idempotente cuando se pueda: `if not exists`, `create or replace`,
  `drop policy if exists` antes de `create policy`.

## Aplicar

```bash
npx tsx scripts/apply-migration.ts supabase/migrations/NNNN_nombre.sql
```

- Va por la Management API con `SUPABASE_ACCESS_TOKEN` de `.env.local`.
  **Es producción**: no hay staging. Pide confirmación al usuario antes de
  aplicar, y di en el commit si quedó aplicada ("migración 0087, ya aplicada").
- El deploy de Vercel **no** aplica migraciones.
- **Nunca** `scripts/db-push.ts`: reaplica todo, incluida
  `0005_reset_data_v2.sql` (TRUNCATE de chats, evaluaciones y normativa).
- **Orden con el código**: si la migración quita permisos que el código en
  producción usa, primero se despliega el código y después se aplica.

## Checklist de seguridad (lo que ya falló aquí)

1. **RLS en toda tabla nueva** + políticas con `to authenticated` y predicado
   de dueño (`(select auth.uid()) = user_id`) en `using` **y** `with check`.
2. **Una política UPDATE no limita columnas.** Si la tabla tiene columnas que
   el servidor confía (estado, rutas de archivos, montos, `is_admin`, rol,
   `reward_granted`, `audio_storage_path`, `retention_until`…), el usuario las
   puede cambiar desde el navegador con la anon key. Opciones:
   - `revoke update on t from authenticated; grant update (col_a, col_b) on t to authenticated;`
   - o sin política UPDATE y que el servidor escriba con service role.
   Así se cerraron `profiles`, `evaluations`, `voice_calls` y `user_surveys`
   en la 0088 y la 0089. Los permisos por columna no se heredan: una columna nueva que
   el usuario deba editar necesita su `grant`.
3. **Columnas internas** (p. ej. `nota_interna` de soporte) no van en una
   tabla que el dueño puede leer con `select *`: tabla aparte o grant por
   columna.
4. **Funciones `security definer`**: `set search_path = public`, comprobar
   `auth.uid()` dentro si actúan por el usuario, y
   `revoke execute on function f from public, anon, authenticated` si solo las
   llama el servidor (como `consumir_creditos`). Valida entradas
   (`p_creditos > 0`).
5. **Créditos y cupos**: el descuento y el límite mensual se comprueban
   dentro de la misma función con `for update`, no leer-y-luego-escribir desde
   TypeScript.
6. Si la búsqueda (`hybrid_search`, `buscar_frase`…) debe ocultar documentos,
   filtra `oculto` en el SQL, no en cada llamador.

## Verificar

```bash
npx tsx scripts/verify-rls.ts     # toda tabla con RLS y alguna política
npx tsx scripts/consultar-bd.ts   # consultas ad hoc
```

Prueba la política como usuario, no como service role: agrega el caso a
`scripts/pruebas/seguridad-rls.ts` (usuario temporal con sesión y anon key;
la escritura prohibida debe fallar o afectar 0 filas).

Actualiza `src/lib/supabase/types.ts` si cambian columnas que usa el código.
