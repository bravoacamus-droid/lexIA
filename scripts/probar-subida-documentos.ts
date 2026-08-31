#!/usr/bin/env tsx
/**
 * Un Word pesado tiene que poder subirse, y un error tiene que decir qué pasa.
 *
 * POR QUÉ EXISTE
 *
 * César subió el 22/08/2026 el "TDR. Servicio de traslado e instalación
 * de gabinete inteligente" y la pantalla respondió:
 *
 *   Fallo al leer el proyecto
 *   JSON.parse: unexpected character at line 1 column 1 of the JSON data
 *
 * Dos fallos encadenados. El archivo pesa 5,6 MB y la plataforma corta
 * los envíos antes de los cuatro y medio, así que contestó ella con una
 * página de error; y la pantalla leía esa página como si fuera JSON.
 *
 * Lo llamativo es de dónde salía el peso: 9,6 MB de tipografías
 * incrustadas por 0,56 MB de texto. Word las mete cuando el autor marca
 * "incrustar fuentes", y no aportan una letra al reparto por apartados.
 *
 * Esta prueba comprueba las dos mitades con el archivo de verdad:
 * que al aligerarlo cabe y el texto extraído es EXACTAMENTE el mismo, y
 * que una respuesta que no es JSON produce un mensaje que se entiende.
 *
 * Uso: npx tsx scripts/probar-subida-documentos.ts
 */
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { adelgazarDocx, esDocx } from '../src/lib/subidas/adelgazar-docx';
import { LIMITE_CUERPO_BYTES, enMegas } from '../src/lib/subidas/limites';
import { leerRespuesta } from '../src/lib/subidas/leer-respuesta';
import { extraerTextoDocumento } from '../src/lib/ai/texto-documento';

/** El archivo real que falló. Si no está, esa parte se salta. */
const TDR = 'TDR. Servicio de traslado e instalacion de gabinete inteligencte.docx';

let fallos = 0;
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

const comoFile = (buf: Buffer, nombre: string) =>
  new File([new Uint8Array(buf)], nombre, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

void (async () => {
  console.log('── Lo que responde la plataforma, no la aplicación ──');
  {
    // Tal cual llega cuando el envío se corta: HTML, no JSON.
    const html = new Response('<!DOCTYPE html><html><body>Request Entity Too Large</body></html>', {
      status: 413,
      headers: { 'content-type': 'text/html' },
    });
    const leida = await leerRespuesta(html);
    comprobar('no revienta al leer una página HTML', !leida.ok);
    comprobar(
      'y dice qué pasó, sin hablar de JSON',
      /pesa demasiado|demasiado grande/i.test(leida.mensaje) && !/JSON/i.test(leida.mensaje),
      leida.mensaje,
    );
  }
  {
    const caida = new Response('502 Bad Gateway', { status: 502 });
    const leida = await leerRespuesta(caida);
    comprobar('una pasarela caída también se explica', !leida.ok && !/JSON/i.test(leida.mensaje));
  }
  {
    const buena = new Response(JSON.stringify({ asignaciones: [1, 2] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const leida = await leerRespuesta<{ asignaciones: number[] }>(buena);
    comprobar('y una respuesta normal se lee igual que antes', leida.ok && !!leida.datos);
  }
  {
    // El servidor sí explicó: manda su mensaje, no el genérico.
    const explicada = new Response(
      JSON.stringify({ error: 'documento_ilegible', sugerencia: 'Es un PDF escaneado.' }),
      { status: 422, headers: { 'content-type': 'application/json' } },
    );
    const leida = await leerRespuesta(explicada);
    comprobar('cuando el servidor explica, se dice lo que dijo', leida.mensaje === 'Es un PDF escaneado.');
  }

  console.log('\n── El Word de César, con el archivo de verdad ──');
  const ruta = join(process.cwd(), TDR);
  const existe = await stat(ruta).catch(() => null);
  if (!existe) {
    console.log(`   ⚠️  no está "${TDR}" en la raíz; se salta esta parte`);
  } else {
    const buf = await readFile(ruta);
    const original = comoFile(buf, TDR);
    console.log(`   pesa ${enMegas(original.size)} · el máximo es ${enMegas(LIMITE_CUERPO_BYTES)}`);
    comprobar('se reconoce como Word', esDocx(original));
    comprobar('y hoy NO cabría en un envío', original.size > LIMITE_CUERPO_BYTES);

    const aligerado = await adelgazarDocx(original);
    console.log(
      `   aligerado: ${enMegas(aligerado.bytesAntes)} → ${enMegas(aligerado.bytesDespues)} · se quitaron ${
        aligerado.quitado.join(' y ') || 'nada'
      }`,
    );
    comprobar('ahora cabe', aligerado.archivo.size <= LIMITE_CUERPO_BYTES);
    comprobar('y se quitaron las tipografías, que era el peso', aligerado.quitado.includes('las tipografías incrustadas'));

    // Lo único que no se puede perder: ni una palabra.
    const antes = await extraerTextoDocumento(original);
    const despues = await extraerTextoDocumento(aligerado.archivo);
    console.log(`   texto: ${antes.texto.length} caracteres antes · ${despues.texto.length} después`);
    comprobar('el texto extraído es exactamente el mismo', antes.texto === despues.texto);
    comprobar(
      'y trae lo que tiene que traer',
      /TÉRMINOS DE REFERENCIA/i.test(despues.texto) && despues.texto.length > 40_000,
    );
  }

  console.log('\n── Lo que no hay que tocar ──');
  {
    // Un Word que ya cabe se envía tal cual: reempaquetarlo sería
    // arriesgar un archivo bueno por nada.
    const pequeno = comoFile(await readFile(join(process.cwd(), 'Preguntas y respuestas.docx')), 'p.docx');
    const r = await adelgazarDocx(pequeno);
    comprobar('un Word que ya cabe no se toca', r.archivo === pequeno && r.quitado.length === 0);
  }
  {
    // Un PDF no es un zip de Word: se devuelve igual, sin romperse.
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], 'x.pdf', { type: 'application/pdf' });
    const r = await adelgazarDocx(pdf, 1);
    comprobar('un PDF se deja como está', r.archivo === pdf);
  }
  {
    // Un .docx corrupto no puede convertir un problema de tamaño en uno
    // de lectura: se devuelve el original y que decida quien llama.
    const roto = comoFile(Buffer.from('esto no es un zip'), 'roto.docx');
    const r = await adelgazarDocx(roto, 1);
    comprobar('un Word ilegible se devuelve intacto', r.archivo === roto);
  }

  console.log(
    fallos === 0
      ? '\n✅ El Word pesado se aligera sin perder texto, y los errores se entienden.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
