#!/usr/bin/env tsx
/**
 * El auditor de citas, contra la biblioteca de verdad.
 *
 * `npx tsx scripts/pruebas/auditor-de-citas.ts`
 *
 * Los casos vienen de la primera prueba del pliego de consultas, el
 * 23/09/2026, y de los errores que cometí al diagnosticarla:
 *
 *   · El aviso que de verdad hacía falta: el escrito atribuyó el
 *     principio de libertad de concurrencia al «artículo 2 de la Ley de
 *     Contrataciones del Estado», el régimen derogado, copiado de las
 *     resoluciones del Tribunal que llenan la biblioteca.
 *   · Las normas que creí inventadas y no lo eran: la «Ley N° 29990» y
 *     la «Directiva N° 001-2019-OSCE/CD» sí las trae el sustento —salen
 *     del Pronunciamiento N° 403-2025/OECE-DSAT y de la Resolución
 *     N° 1005-2026-S4—. Cuando el sustento las trae NO deben marcarse, y
 *     cuando no, sí. Están las dos caras.
 *   · El importe disfrazado de ley: mientras el sustento se comparaba
 *     sin puntos, un «S/ 29.990,00» avalaba una «Ley N° 29990». Por eso
 *     ahora se comparan citas con citas.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
loadEnv({ path: join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import { auditarCitas, extraerCitas } from '../../src/lib/normativa/citas';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * La misma búsqueda que en producción, con la llave de servicio.
 *
 * Revienta si la consulta falla en vez de devolver `false`: dar por
 * inexistente lo que no se pudo comprobar es justo el error que me hizo
 * acusar al modelo de inventarse dos normas.
 */
const buscar = async (clave: string) => {
  const { data, error } = await sb
    .from('normative_documents')
    .select('id')
    .or(`number.ilike.%${clave}%,title.ilike.%${clave}%`)
    .limit(1);
  if (error) throw new Error(`la biblioteca no respondió por «${clave}»: ${error.message}`);
  return (data?.length ?? 0) > 0;
};

/** Un sustento como el que devuelve la biblioteca al redactar. */
const SUSTENTO = `
[1] pronunciamiento Pronunciamiento N° 080-2025/OECE-DSAT — Sobre experiencia del postor
La Entidad debe evaluar la naturaleza técnica de los trabajos. Artículo 72 del Reglamento.
---
[2] ley Ley N° 32069 + DS N° 009-2025-EF — Ley General de Contrataciones Públicas
Artículo 5. Principios rectores de la contratación pública. 5.1. Las contrataciones se
rigen por los siguientes principios: b) Libertad de concurrencia.
---
[3] resolucion_tce Resolución N° 4188-2026-S6 — Sobre la ejecución de la garantía
El monto de la penalidad asciende a S/ 29.990,00 conforme al contrato suscrito.
`.trim();

/** El mismo, con el párrafo real del Pronunciamiento N° 403-2025. */
const SUSTENTO_CON_29990 = `${SUSTENTO}

---

[4] pronunciamiento Pronunciamiento N° 403-2025/OECE-DSAT — Sobre obras viales y afines
Este artículo incluye dentro de la especialidad "obras viales y afines" las obras rurales
y vecinales, las cuales forman parte del sistema nacional de carreteras (Ley N.° 29990 –
Ley de conservación y gestión de la red vial vecinal).`;

interface Caso {
  nombre: string;
  texto: string;
  sustento?: string;
  esperado: string[];
}

const CASOS: Caso[] = [
  {
    nombre: 'el régimen derogado se marca, venga de donde venga',
    texto: 'Conforme al artículo 2 de la Ley de Contrataciones del Estado, la Entidad…',
    esperado: ['Ley de Contrataciones del Estado', 'artículo 2'],
  },
  {
    nombre: 'el TUO de la ley vieja también',
    texto: 'De acuerdo con el artículo 50 del TUO de la Ley, constituye infracción…',
    esperado: ['TUO de la Ley', 'artículo 50'],
  },
  {
    nombre: 'una norma que el sustento no trae y la biblioteca no tiene',
    texto: 'Ley N.° 29990 – Ley de conservación y gestión de la red vial vecinal.',
    esperado: ['Ley N.° 29990'],
  },
  {
    nombre: 'la misma norma, cuando el sustento sí la trae',
    texto: 'Conforme a la Ley N.° 29990, los caminos vecinales integran el sistema vial…',
    sustento: SUSTENTO_CON_29990,
    esperado: [],
  },
  {
    nombre: 'un importe parecido al número de una ley no la avala',
    texto: 'Conforme a la Ley N° 29990, la red vial vecinal…',
    esperado: ['Ley N° 29990'],
  },
  {
    nombre: 'una directiva que no está en ninguna parte',
    texto: 'En concordancia con la Directiva N° 001-2019-OSCE/CD, las entidades deben…',
    esperado: ['Directiva N° 001-2019-OSCE/CD'],
  },
  {
    nombre: 'citas correctas y respaldadas: ni un aviso',
    texto:
      'Conforme al artículo 5 de la Ley N° 32069 y al Pronunciamiento N° 080-2025/OECE-DSAT, ' +
      'así como al artículo 72 del Reglamento aprobado por Decreto Supremo N° 009-2025-EF.',
    esperado: [],
  },
  {
    nombre: 'un pronunciamiento del OSCE por su nombre no es hablar del OSCE',
    texto: 'Según el Pronunciamiento N° 080-2025/OSCE-DGR, la Entidad debe precisar…',
    esperado: [],
  },
];

function encaja(marcada: string, esperada: string): boolean {
  return marcada.includes(esperada) || esperada.includes(marcada);
}

void (async () => {
  let fallos = 0;
  for (const c of CASOS) {
    const { avisos } = await auditarCitas(c.texto, c.sustento ?? SUSTENTO, buscar);
    const marcadas = avisos.map((a) => a.cita);
    const faltan = c.esperado.filter((e) => !marcadas.some((m) => encaja(m, e)));
    const sobran = marcadas.filter((m) => !c.esperado.some((e) => encaja(m, e)));
    const bien = faltan.length === 0 && sobran.length === 0;
    if (!bien) fallos++;
    console.log(`${bien ? '✓' : '✗'} ${c.nombre}`);
    for (const a of avisos) console.log(`     ⚠ ${a.cita} — ${a.motivo}`);
    if (faltan.length) console.log(`     NO marcó: ${faltan.join(', ')}`);
    if (sobran.length) console.log(`     marcó de más: ${sobran.join(', ')}`);
  }

  console.log();
  console.log(`${CASOS.length - fallos}/${CASOS.length} casos`);

  console.log();
  console.log('── el extractor, sobre el escrito real de la prueba ──');
  const real =
    'Ley N° 29990 y numeral 72.3 del artículo 72 del Reglamento aprobado por ' +
    'Decreto Supremo N° 009-2025-EF.';
  for (const x of extraerCitas(real)) {
    console.log(`   ${x.clase.padEnd(15)} ${x.clave.padEnd(16)} «${x.texto}»`);
  }

  process.exit(fallos === 0 ? 0 : 1);
})();
