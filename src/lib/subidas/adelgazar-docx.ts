/**
 * Quita de un Word lo que pesa y no se lee.
 *
 * POR QUÉ EXISTE
 *
 * El TDR que subió César el 22/08/2026 ocupaba 5,6 MB y no llegaba al
 * servidor. Al abrirlo —un .docx es un zip— el reparto era este:
 *
 *   · tipografías incrustadas (`word/fonts/*.odttf`): 9,6 MB sin
 *     comprimir, la práctica totalidad del archivo;
 *   · el texto (`word/document.xml`): 0,56 MB;
 *   · las imágenes: 0,34 MB.
 *
 * Word incrusta las fuentes cuando el autor marca "Incrustar fuentes en
 * el archivo", y así un documento de cuarenta mil caracteres pesa como
 * un vídeo. Para repartir el proyecto por los apartados del formato solo
 * hace falta el texto: las fuentes no aportan una letra.
 *
 * Quitándolas, ese TDR pasa de 5,62 MB a 0,73 MB y el texto extraído es
 * IDÉNTICO —43 406 caracteres, comprobado carácter a carácter—. Si aun
 * así no cabe, se quitan también las imágenes: 0,40 MB, y el texto sigue
 * siendo el mismo.
 *
 * Se hace en el navegador, antes de enviar, porque el problema es el
 * envío. Lo que llega al servidor sigue siendo un .docx legítimo y lo
 * lee el mismo extractor de siempre.
 */
import { LIMITE_CUERPO_BYTES } from './limites';

/** Lo que se puede tirar sin perder una palabra, en orden de descarte. */
const PRESCINDIBLE = [
  // Las tipografías incrustadas: el 95 % del peso del caso real.
  { prefijo: 'word/fonts/', que: 'las tipografías incrustadas' },
  // Las imágenes: no se reparten por apartados, y el formato oficial
  // trae las suyas.
  { prefijo: 'word/media/', que: 'las imágenes' },
] as const;

export interface DocxAdelgazado {
  archivo: File;
  /** Qué se quitó, para poder decírselo al usuario. */
  quitado: string[];
  bytesAntes: number;
  bytesDespues: number;
}

/** ¿Es un Word que podamos abrir como zip? */
export function esDocx(f: File): boolean {
  return (
    f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    f.name.toLowerCase().endsWith('.docx')
  );
}

/**
 * Devuelve el mismo Word sin lo que sobra, o el original si ya cabía o
 * si no se pudo abrir.
 *
 * Nunca lanza: si el zip viene raro, se devuelve el archivo tal cual y
 * que decida quien llama. Fallar aquí sería cambiar un problema de
 * tamaño por uno de lectura.
 */
export async function adelgazarDocx(
  archivo: File,
  limite = LIMITE_CUERPO_BYTES,
): Promise<DocxAdelgazado> {
  const sinTocar: DocxAdelgazado = {
    archivo,
    quitado: [],
    bytesAntes: archivo.size,
    bytesDespues: archivo.size,
  };
  if (archivo.size <= limite || !esDocx(archivo)) return sinTocar;

  try {
    // La carga va aquí dentro y no arriba: quien no suba un Word
    // gigante no tiene por qué descargarse el lector de zip.
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await archivo.arrayBuffer());

    const quitado: string[] = [];
    for (const { prefijo, que } of PRESCINDIBLE) {
      const sobra = Object.keys(zip.files).filter((n) => n.startsWith(prefijo));
      if (sobra.length === 0) continue;
      for (const n of sobra) zip.remove(n);
      quitado.push(que);

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        mimeType: archivo.type,
      });
      // En cuanto cabe, se para: cuanto menos se toque, mejor.
      if (blob.size <= limite) {
        return {
          archivo: new File([blob], archivo.name, { type: archivo.type }),
          quitado,
          bytesAntes: archivo.size,
          bytesDespues: blob.size,
        };
      }
    }

    if (quitado.length === 0) return sinTocar;

    // Se quitó todo lo prescindible y aun así no cabe: se devuelve
    // igualmente, porque más pequeño es mejor aunque no baste, y quien
    // llama dirá qué hacer.
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      mimeType: archivo.type,
    });
    return {
      archivo: new File([blob], archivo.name, { type: archivo.type }),
      quitado,
      bytesAntes: archivo.size,
      bytesDespues: blob.size,
    };
  } catch {
    return sinTocar;
  }
}
