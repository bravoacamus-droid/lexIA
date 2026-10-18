/**
 * Documento 15 de César (17/10/2026): las reglas que se deciden por código,
 * sin llamar al modelo, sobre los textos reales de las evaluaciones.
 *   · números en letras y el cuadre del Anexo N° 6 (precio.ts);
 *   · el inicio del cómputo del plazo ofertado (plazo.ts);
 *   · la promesa de consorcio de ESTE procedimiento (identificacion.ts).
 * Uso: npx tsx scripts/pruebas/doc15.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { numeroEnLetras, juzgarPrecio } from '../../src/lib/evaluacion/precio';
import { compromisoDePlazo, hitoDeLasBases, revisarPlazo } from '../../src/lib/evaluacion/plazo';
import { hayPromesaDeConsorcio } from '../../src/lib/evaluacion/identificacion';
import { formaSocial } from '../../src/lib/evaluacion/certificaciones';
import type { FichaRequisito } from '../../src/lib/evaluacion/etapas';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

async function textos(id: string) {
  const { data, error } = await db.from('evaluations').select('textos').eq('id', id).single();
  if (error) throw error;
  const t = data.textos as { bases: string; ofertas: Array<{ postor?: string; texto: string }> };
  return t;
}

void (async () => {
  // 1. Números en letras.
  const casos: Array<[string, number | null]> = [
    ['Trescientos cuarenta y seis mil trescientos setenta con 00/100 en SOLES', 346370],
    ['TRESCIENTOS CINCUENTA Y CUATRO MIL SETECIENTOS CINCUENTA CON 00/100 SOLES', 354750],
    ['TRESCIENTOS TREINTA Y UN MIL CINCUENTA Y DOS CON 70/100', 331052.7],
    ['TRESCIENTOS CUARENTA UN MIL SEISCIENTOS SESENTINUEVE Y 30/100 SOLES', 341669.3],
    ['Treintidos mil trescientos cuarenta con 00/100 Soles', 32340],
    ['Un millón doscientos cuarenta y un mil doscientos cuarenta con 20/100', 1241240.2],
    ['TRESICIENTOS CINCUENTA Y CUATRO MIL SETECIENTOS CINCUENTA CUENTA CON 00/100 SOLES', null],
    ['Trescientos [ilegible] mil', null],
  ];
  for (const [t, esperado] of casos) {
    const n = numeroEnLetras(t);
    ok(n === esperado, `«${t.slice(0, 60)}…» → ${n} (esperado ${esperado})`);
  }

  // 2. Cuadre del Anexo N° 6.
  const eddu = juzgarPrecio({
    pagina: 18,
    items: [{ cantidad: 7095, precioUnitario: 46, subtotal: 326370 }],
    totalEnNumeros: 346370,
    totalEnLetras: 'Trescientos cuarenta y seis mil trescientos setenta con 00/100',
  });
  ok(eddu.estado === 'incongruente', `EDDU: 7 095 × 46 = 326 370 y letras 346 370 → ${eddu.estado}`);
  const pozo = juzgarPrecio({
    pagina: 56,
    items: [{ cantidad: 7095, precioUnitario: 50, subtotal: 354750 }],
    totalEnNumeros: 354750,
    totalEnLetras: 'TRESCIENTOS CINCUENTA Y CUATRO MIL SETECIENTOS CINCUENTA CON 00/100 SOLES',
  });
  ok(pozo.estado === 'conforme', `POZO: imagen del Anexo 6 → ${pozo.estado}`);
  const letrasMandan = juzgarPrecio({
    items: [{ cantidad: 10, precioUnitario: 100, subtotal: 1000 }],
    totalEnNumeros: 1100,
    totalEnLetras: 'Mil con 00/100 soles',
  });
  ok(letrasMandan.estado === 'prevalecen_letras', `números mal sumados, letras = cantidad × precio unitario → ${letrasMandan.estado}`);
  const ocr = juzgarPrecio({ items: [], totalEnNumeros: 354750, totalEnLetras: 'TRESICIENTOS … CUENTA' });
  ok(ocr.estado === 'indeterminado', `letras ilegibles → ${ocr.estado} (no se observa)`);

  // 3. Plazo y consorcio, sobre los textos de Kimbiri (evaluación de César).
  const k = await textos('c3d39b1c-b463-4f2e-b57a-20da6c2684de');
  const hito = hitoDeLasBases(k.bases);
  ok(hito && /suscripci[óo]n del contrato/i.test(hito), `hito de las Bases: «${hito}»`);
  const ficha = (postor: string): FichaRequisito =>
    ({ id: 'plazo_de_entrega', requisito: 'B. PLAZO DE ENTREGA', reglaBases: '', documentoPresentado: '', evidencia: [], hallazgo: 'cumple', jurisprudencia: [], resultado: 'cumple', confianza: 'alta', puntaje: 25, puntajeMaximo: 25, postor }) as unknown as FichaRequisito;
  const porPostor = Object.fromEntries(k.ofertas.map((o, i) => [['EDDU', 'POZO', 'AGUILAR'][i], o.texto]));
  for (const [quien, texto] of Object.entries(porPostor)) {
    const c = compromisoDePlazo(texto);
    const r = revisarPlazo(ficha(quien), texto, k.bases);
    const esperado = quien === 'POZO' ? 'revision_humana' : 'cumple';
    ok(r.resultado === esperado && (quien !== 'POZO' || r.puntaje === 0), `${quien}: plazo «${c?.frase.slice(0, 90)}…» → ${r.resultado}, ${r.puntaje} pts`);
  }
  ok(!hayPromesaDeConsorcio(porPostor.EDDU), 'EDDU: el contrato de consorcio de 2023 no es promesa de este procedimiento');
  ok(!hayPromesaDeConsorcio(porPostor.POZO) && !hayPromesaDeConsorcio(porPostor.AGUILAR), 'POZO y AGUILAR: sin promesa de consorcio');

  // 4. Sostenibilidad social: la forma de cada certificado.
  const regla = 'Certificado emitido por un Organismo de Certificación acreditado ante el “Social Accountability Accreditation Services” (SAAS). O Reconocimiento del Ministerio de Trabajo o certificación en buenas prácticas laborales vinculadas al salario justo…';
  const pagina = (texto: string, rx: RegExp) => texto.split(/(?==== P[áa]gina \d+ ===)/).find((t) => rx.test(t)) ?? '';
  const pozoCert = formaSocial(pagina(porPostor.POZO, /SR 2030:2023/), regla);
  ok(pozoCert.forma === 'buenas_practicas' && pozoCert.cumple, `POZO: buenas prácticas laborales (SR 2030) → ${pozoCert.forma}, ${pozoCert.cumple ? 'acredita' : 'no acredita'}`);
  const aguilarCert = formaSocial(pagina(porPostor.AGUILAR, /SA 8000:2026/), regla);
  ok(aguilarCert.forma === 'sa8000' && !aguilarCert.cumple, `AGUILAR: SA 8000 sin SAAS → ${aguilarCert.forma}, ${aguilarCert.cumple ? 'acredita' : 'no acredita'}`);
  const sinFormaC = formaSocial(pagina(porPostor.POZO, /SR 2030:2023/), 'Certificado SA 8000:2014 emitido por Organismo acreditado ante SAAS.');
  ok(!sinFormaC.cumple, 'si las Bases solo admiten SA 8000, las buenas prácticas laborales no acreditan');

  // 5. Los consorcios del documento 13 siguen siendo consorcios.
  const v = await textos('3708b632-3ecc-4e7b-80ba-da7b1b86b7af');
  const conPromesa = v.ofertas.filter((o) => hayPromesaDeConsorcio(o.texto)).length;
  ok(conPromesa >= 4, `CP SER-SM-6-2026: ${conPromesa} de ${v.ofertas.length} ofertas con promesa de consorcio (eran consorcios)`);

  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ Reglas del documento 15 por código: todo bien.');
  process.exit(fallas ? 1 : 0);
})();
