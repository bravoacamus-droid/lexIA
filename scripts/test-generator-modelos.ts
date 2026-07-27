/**
 * Test E2E del generador contra los MODELOS REALES de César
 * (carpetas entidad/ y consultor/, entregadas 24-25/07/2026):
 *
 *  CASO 1 — perfil DEC: informe de cálculo de penalidad
 *    vs "INFORME - Cálculo de penalidad de vigilancia.pdf"
 *  CASO 2 — perfil POSTOR: recurso de apelación al Tribunal
 *    vs "8.- Apelación al Tribunal - CP 007-2026 - PRESENTACIÓN"
 *
 * Simula el system prompt EXACTO del route (perfil + instrucciones +
 * FORMATO + ESTRUCTURAS_MODELO) y puntúa la salida contra los puntos
 * estructurales y de fondo de los modelos reales.
 *
 * Uso: npx tsx scripts/test-generator-modelos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { generateText } from 'ai';
import { generatorModel } from '../src/lib/ai/gemini';
import {
  GENERATOR_PERFILES,
  FORMATO_DOCUMENTO_ADMINISTRATIVO,
  ESTRUCTURAS_MODELO,
  type GeneratorPerfil,
} from '../src/lib/ai/generator-perfiles';

type KeyPoint = {
  desc: string;
  patterns: RegExp[];
  critical?: boolean;
  /** true → los patterns NO deben aparecer (prohibición) */
  absent?: boolean;
};

function buildSystemPrompt(perfilKey: GeneratorPerfil): string {
  const perfil = GENERATOR_PERFILES[perfilKey];
  return `${perfil.systemPrompt}

═══════════════════════════════════════════════════════
INSTRUCCIONES DEL GENERADOR
═══════════════════════════════════════════════════════
El usuario está en un chat conversacional. Cuando pida redactar un
documento, produce el documento COMPLETO en formato markdown, listo
para copiar.
${FORMATO_DOCUMENTO_ADMINISTRATIVO}
${ESTRUCTURAS_MODELO[perfilKey] ?? ''}

PROHIBIDO usar notación LaTeX ($$, \\frac, \\text, \\times): el chat y
la exportación a Word NO la renderizan. Escribe fórmulas y cálculos en
texto plano con paréntesis, ej.:
Penalidad diaria = (0.10 × 15,000.00) / (0.40 × 30) = S/ 125.00`;
}

const CASOS: Array<{
  nombre: string;
  perfil: GeneratorPerfil;
  prompt: string;
  keyPoints: KeyPoint[];
}> = [
  {
    nombre: 'CASO 1 — DEC: informe de cálculo de penalidad',
    perfil: 'dec',
    prompt: `Redacta el informe técnico de cálculo de penalidad para este caso:

- Orden de Servicio N° 0455-2026 por el "Servicio de vigilancia privada para la sede central", monto S/ 45,000.00, plazo 90 días calendario, notificada el 02/03/2026.
- El TDR (numeral 9.1) exige presentar el informe mensual de servicio dentro de los 5 primeros días hábiles del mes siguiente. El contratista presentó el informe de abril recién el 15/05/2026 (vencía el 08/05/2026).
- El TDR (numeral 9.3, otras penalidades) fija: "Por no contar el personal de vigilancia con uniforme completo: 0.5% del monto mensual por cada ocurrencia". El acta de conformidad de abril reporta 2 ocurrencias verificadas. El monto mensual es S/ 15,000.00.
- Aplica también la penalidad por mora del Reglamento por los días de retraso en la entrega del informe mensual (entregable valorizado en el monto mensual).

Dirigido al Jefe de la Oficina de Administración, firmado por el especialista en contrataciones.`,
    keyPoints: [
      { desc: 'Encabezado INFORME con PARA:', patterns: [/PARA\s*:/i], critical: true },
      { desc: 'Campo ASUNTO con cálculo de penalidad', patterns: [/ASUNTO\s*:/i], critical: true },
      { desc: 'Campo REFERENCIA', patterns: [/REFERENCIA\s*:/i], critical: true },
      { desc: 'Fórmula "Tengo el agrado de dirigirme"', patterns: [/tengo\s+el\s+agrado\s+de\s+dirigirme/i] },
      { desc: 'Sección I. ANTECEDENTES', patterns: [/I\.\s*ANTECEDENTES/i], critical: true },
      { desc: 'Numeración decimal 1.1 / 2.1', patterns: [/\d\.\d\.?\s/], critical: true },
      { desc: 'Sección ANÁLISIS', patterns: [/AN[ÁA]LISIS/i], critical: true },
      { desc: 'Fórmula de penalidad diaria (0.10 × monto / F × plazo)', patterns: [/0\.10\s*[x×*]\s*(?:monto|15,?000)|penalidad\s+diaria\s*[=:]/i], critical: true },
      { desc: 'Factor F aplicado', patterns: [/\bF\s*(?:=|es)\s*0\.\d+|factor\s+F/i], critical: true },
      { desc: 'Sin notación LaTeX (debe ser texto plano)', patterns: [/\$\$|\\frac|\\text\{|\\times/], critical: true, absent: true },
      { desc: 'Cómputo de días de retraso con fechas (08/05 → 15/05)', patterns: [/retraso|d[íi]as?\s+de\s+atraso/i], critical: true },
      { desc: 'Cita numeral 9.1 del TDR', patterns: [/9\.1/], critical: true },
      { desc: 'Otras penalidades: numeral 9.3 uniforme', patterns: [/9\.3|uniforme/i], critical: true },
      { desc: 'Cálculo 0.5% × 15,000 × 2 ocurrencias = S/ 150', patterns: [/150(?:\.00)?/], critical: true },
      { desc: 'Tabla markdown de cálculo', patterns: [/\|.*\|.*\|/], critical: true },
      { desc: 'Total a deducir consolidado', patterns: [/total/i], critical: true },
      { desc: 'CONCLUSIONES o RECOMENDACIÓN', patterns: [/CONCLUSION|RECOMENDACI[ÓO]N/i], critical: true },
      { desc: 'Cierre Atentamente', patterns: [/atentamente/i] },
      { desc: 'Base legal del Reglamento citada (art. penalidades)', patterns: [/reglamento/i], critical: true },
    ],
  },
  {
    nombre: 'CASO 2 — POSTOR: recurso de apelación al Tribunal',
    perfil: 'postor',
    prompt: `Redacta un recurso de apelación ante el Tribunal de Contrataciones Públicas para este caso:

- Procedimiento: Concurso Público N° 003-2026-GRA para el "Servicio de consultoría para supervisión de obra vial", Entidad: Gobierno Regional de Ayacucho, valor referencial S/ 2,850,000.00.
- Mi empresa CONSULTORES ANDINOS S.A.C. (RUC 20512345678, gerente general Juan Pérez Quispe, DNI 28456789) quedó en segundo lugar.
- El comité otorgó la buena pro a SUPERVISIONES DEL SUR E.I.R.L. pese a que su profesional propuesto como jefe de supervisión NO acredita los 5 años de experiencia exigidos en las bases integradas (literal B.1 del capítulo III): sus certificados suman solo 3 años y 8 meses.
- La buena pro se notificó por el SEACE el 20/07/2026.
- Pretensión: que se revoque la buena pro, se descalifique la oferta ganadora y se otorgue la buena pro a mi representada.`,
    keyPoints: [
      { desc: 'Encabezado procesal (Sumilla/Escrito)', patterns: [/sumilla|escrito\s+n/i], critical: true },
      { desc: 'Vocativo SEÑOR PRESIDENTE DEL TRIBUNAL', patterns: [/SE[ÑN]OR\s+PRESIDENTE\s+DEL\s+TRIBUNAL/i], critical: true },
      { desc: 'Identificación con RUC del recurrente', patterns: [/20512345678/], critical: true },
      { desc: 'Representante con DNI', patterns: [/28456789/], critical: true },
      { desc: 'Plazo legal invocado (art. 304 o días hábiles)', patterns: [/304|d[íi]as?\s+h[áa]biles/i], critical: true },
      { desc: 'NOMENCLATURA DEL PROCEDIMIENTO', patterns: [/NOMENCLATURA/i], critical: true },
      { desc: 'ENTIDAD CONTRATANTE', patterns: [/ENTIDAD\s+CONTRATANTE/i], critical: true },
      { desc: 'CUANTÍA con el valor referencial', patterns: [/2[’'.,]?850[,.]000/], critical: true },
      { desc: 'PETITORIO con pretensiones', patterns: [/PETITORIO/i], critical: true },
      { desc: 'FUNDAMENTOS DE HECHO', patterns: [/FUNDAMENTOS?\s+DE\s+HECHO/i], critical: true },
      { desc: 'FUNDAMENTO DE DERECHO', patterns: [/FUNDAMENTOS?\s+DE\s+DERECHO/i], critical: true },
      { desc: 'Agravio: experiencia 3 años 8 meses vs 5 exigidos', patterns: [/3\s+a[ñn]os|cinco\s*\(?5\)?\s*a[ñn]os|5\s+a[ñn]os/i], critical: true },
      { desc: 'Cita el literal B.1 de las bases', patterns: [/B\.1/], critical: true },
      { desc: 'MEDIOS PROBATORIOS', patterns: [/MEDIOS\s+PROBATORIOS/i], critical: true },
      { desc: 'ANEXOS con garantía por interposición', patterns: [/ANEXOS/i], critical: true },
      { desc: 'Garantía por interposición del recurso (3%)', patterns: [/garant[íi]a.*(?:interposici[óo]n|recurso)|3\s*%/i], critical: true },
      { desc: 'POR LO TANTO:', patterns: [/POR\s+LO\s+TANTO/i], critical: true },
      { desc: 'Pide revocar y otorgar buena pro al recurrente', patterns: [/revoc|FUNDADO/i], critical: true },
    ],
  },
];

async function main() {
  let global = 0;
  for (const caso of CASOS) {
    console.log('\n' + '═'.repeat(60));
    console.log(caso.nombre);
    console.log('═'.repeat(60));
    const start = Date.now();
    const result = await generateText({
      model: generatorModel,
      system: buildSystemPrompt(caso.perfil),
      messages: [{ role: 'user', content: caso.prompt }],
      temperature: 0.3,
    });
    const ms = Date.now() - start;
    const text = result.text;
    console.log(`⏱ ${ms}ms | ${text.length} chars | finish=${result.finishReason}`);

    let earned = 0;
    let possible = 0;
    const misses: string[] = [];
    for (const kp of caso.keyPoints) {
      const w = kp.critical ? 2 : 1;
      possible += w;
      const matched = kp.patterns.some((rx) => rx.test(text));
      if (kp.absent ? !matched : matched) earned += w;
      else misses.push(kp.desc + (kp.critical ? ' ⚠️CRÍTICO' : ''));
    }
    const pct = Math.round((earned / possible) * 100);
    global += pct;
    console.log(`SCORE: ${pct}% (${caso.keyPoints.length - misses.length}/${caso.keyPoints.length} puntos)`);
    if (misses.length) {
      console.log('FALTARON:');
      misses.forEach((m) => console.log('  ✗', m));
    }
    console.log('\n--- DOCUMENTO COMPLETO ---');
    console.log(text);
  }
  console.log('\n' + '═'.repeat(60));
  console.log(`PROMEDIO GLOBAL: ${Math.round(global / CASOS.length)}%`);
}

main().catch(console.error);
