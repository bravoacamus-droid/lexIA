#!/usr/bin/env tsx
/**
 * El generador de ejecución contractual de punta a punta, con el modelo.
 *
 * `npx tsx scripts/pruebas/ejecucion-con-modelo.ts [perfil] [nivel]`
 *
 * Lee los documentos del caso, diagnostica, redacta, audita y escribe el
 * Word del documento y de la ficha de control en tmp/. No toca la base
 * de datos: los documentos se arman en memoria.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
loadEnv({ path: join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import { leerDocumento } from '../../src/lib/ejecucion/lectura';
import { componerAnalisis, interpretarConModelo, prepararCaso } from '../../src/lib/ejecucion/diagnostico';
import { redactarDocumento } from '../../src/lib/ejecucion/redaccion';
import { auditarDocumento } from '../../src/lib/ejecucion/auditoria';
import { documentoADocx, documentoEnMarkdown, fichaADocx } from '../../src/lib/ejecucion/documento';
import { CLASES, type Actuacion, type Perfil } from '../../src/lib/ejecucion/catalogo';
import type { DocumentoDelExpediente, NivelDeSalida, Respuesta } from '../../src/lib/ejecucion/tipos';
import { CONTRATO_SERVICIOS, SOLICITUD_AMPLIACION, CONTRATO_BIENES_ANTERIOR } from './ejecucion-casos';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const perfil = (process.argv[2] ?? 'dec') as Perfil;
const nivelPedido = (process.argv[3] ?? 'auto') as NivelDeSalida | 'auto';
const caso = process.argv[4] ?? 'ampliacion';

async function documento(nombre: string, texto: string): Promise<DocumentoDelExpediente> {
  const lectura = await leerDocumento(nombre, texto, null);
  console.log(`\n📄 ${nombre}: ${CLASES[lectura.clase].nombre} · ${lectura.titulo} · ${lectura.fecha}`);
  console.log('   ficha:', lectura.ficha.map((f) => `${f.campo}=${f.valor}`).join(' | '));
  console.log('   hechos:', lectura.hechos.length, '· montos:', lectura.montos.map((m) => `${m.concepto}:${m.monto}`).join(', '), '· descartadas:', lectura.descartadas);
  return {
    id: nombre,
    nombre,
    ruta: null,
    origen: 'cargado',
    estado: 'original',
    carpeta: CLASES[lectura.clase].carpeta,
    clase: lectura.clase,
    lectura: 'leido',
    error: null,
    texto,
    paginas: 1,
    datos: lectura,
    generacion: null,
    formalizacion: null,
    actuacion_id: null,
    version_de: null,
    created_at: new Date().toISOString(),
  };
}

void (async () => {
  const t0 = Date.now();
  const docs =
    caso === 'anterior'
      ? [await documento('Contrato 0115-2024.docx', CONTRATO_BIENES_ANTERIOR)]
      : [await documento('Contrato 015-2026.pdf', CONTRATO_SERVICIOS), await documento('Carta 027-2026 solicitud de ampliación.pdf', SOLICITUD_AMPLIACION)];
  const actuacion: Actuacion = caso === 'anterior' ? 'resolucion' : 'ampliacion_plazo';
  const pedido =
    caso === 'anterior'
      ? 'La Entidad no pagó el primer entregable pese a tener conformidad desde el 10 de junio de 2024. Queremos resolver el contrato.'
      : 'La Entidad recibió una solicitud de ampliación de plazo del contratista por el cierre de locales. Necesito evaluarla.';
  const respuestas: Respuesta[] = (process.env.RESPUESTAS ?? '')
    .split('|')
    .filter(Boolean)
    .map((x) => {
      const [preguntaId, respuesta] = x.split('=');
      return { preguntaId, pregunta: preguntaId, respuesta, fecha: new Date().toISOString() };
    });

  const c = prepararCaso({ perfil, actuacion, actuacionPedida: actuacion, pedido, documentos: docs, fichaUsuario: {}, respuestas });
  console.log('\n🧭 tipo:', c.tipo, '· régimen:', c.regimen.clave, '·', c.regimen.razon);
  console.log('   cálculos:', c.calculos.map((x) => `${x.concepto}: ${x.resultado}`).join(' | ') || '—');
  const { lectura, sustento } = await interpretarConModelo(sb, c, null);
  const a = componerAnalisis(c, lectura, sustento);
  console.log('\n🔎 Entendimiento:', a.entendimiento);
  console.log('   Figura:', a.figura.nombre, a.figura.corresponde ? '✓' : '✗', a.figura.razon.slice(0, 160));
  console.log('   Procedencia:', a.procedencia.semaforo, '—', a.procedencia.razon.slice(0, 300));
  console.log('   Suficiencia:', a.suficiencia, '%', a.semaforoInformacion, '· niveles:', a.nivelesPermitidos.join(', '));
  console.log('   Mensaje:', a.mensajeSuficiencia);
  console.log('   Requisitos:');
  for (const r of a.requisitos) console.log(`     [${r.nivel}] ${r.estado.padEnd(10)} ${r.texto}${r.documento ? ` — ${r.documento}` : ''}`);
  console.log('   Condiciones:');
  for (const x of a.condiciones) console.log(`     ${x.estado.padEnd(13)} ${x.id}${x.calculada ? ' (calculada)' : ''}: ${x.sustento.slice(0, 140)} ${x.evidencia.length ? `[${x.evidencia.length} ev]` : ''}`);
  console.log('   Hechos:', a.hechos.map((h) => `${h.estado}: ${h.hecho.slice(0, 70)}`).join(' | '));
  console.log('   Riesgos:', a.riesgos.map((r) => `${r.gravedad}: ${r.descripcion.slice(0, 90)}`).join(' | '));
  console.log('   Contradicciones:', a.contradicciones.map((x) => x.descripcion.slice(0, 120)).join(' | ') || '—');
  console.log('   Competencia:', a.competencia.organo, '·', a.competencia.base);
  console.log('   Documento:', a.documento.titulo, '·', a.documento.advertencia ?? '');
  console.log('   Pregunta:', a.pregunta ? `${a.pregunta.texto} (${a.pregunta.porQue})` : '—');
  console.log('   Advertencias:', a.advertencias.join(' | ') || '—');

  const nivel: NivelDeSalida = nivelPedido === 'auto' ? a.nivelesPermitidos[a.nivelesPermitidos.length - 1] : nivelPedido;
  const borrador = await redactarDocumento({ perfil, nivel, analisis: a, ficha: c.ficha, documentos: docs, pedido, respuestas, version: 1, usuario: null });
  const datos = { borrador, perfil, ficha: c.ficha, anio: 2026 };
  const md = documentoEnMarkdown(datos);
  const auditoria = await auditarDocumento({ texto: md, analisis: a, ficha: c.ficha, documentos: docs, respuestas, pedido, perfil, hoy: c.hoy, version: 1, usuario: null });
  console.log(`\n📝 ${borrador.titulo} (${nivel}) — ${md.length} caracteres`);
  console.log('   Auditoría:', auditoria.bloquea ? '⛔ BLOQUEA' : '✅', auditoria.hallazgos.map((h) => `[${h.gravedad}/${h.tipo}] ${h.texto}`).join('\n     '));
  const base = `tmp/ejecucion-${caso}-${perfil}`;
  writeFileSync(`${base}.md`, md);
  writeFileSync(`${base}.docx`, await documentoADocx(datos));
  writeFileSync(`${base}-ficha.docx`, await fichaADocx({ titulo: borrador.titulo, perfil, analisis: a, documentos: docs, borrador, auditoria, ficha: c.ficha }));
  writeFileSync(`${base}-analisis.json`, JSON.stringify(a, null, 2));
  console.log(`\n💾 ${base}.md / .docx / -ficha.docx · ${Math.round((Date.now() - t0) / 1000)} s`);
})();
