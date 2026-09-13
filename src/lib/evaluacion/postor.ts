/**
 * Quién es el postor de una oferta.
 *
 * Vive en la biblioteca y no en la ruta porque una ruta de Next solo
 * puede exportar sus manejadores: cualquier otra exportación rompe la
 * compilación.
 */
/**
 * La razón social del postor, leída de SU OFERTA.
 *
 * Antes se tomaba del nombre del archivo, y el acta salía con el postor
 * llamado "OEFA" o "PROPUESTA+ECONOMICA+OEFA" —que es como el usuario
 * había guardado los PDF— mientras la evidencia interna citaba
 * correctamente "UKUMARU'S SECURITY S.A.C., RUC N.° 20613176331".
 * Observación de César (setiembre de 2026), repetida seis veces en la
 * misma acta: "completa el nombre de la empresa según el nombre del
 * archivo de la oferta y no del nombre del postor".
 *
 * Se busca la forma societaria —S.A.C., S.A.A., S.R.L., E.I.R.L.,
 * S.A.— porque es lo que cierra una razón social peruana, y se queda
 * con la que más veces aparece: en una oferta de decenas de páginas, la
 * del postor se repite en cada anexo, mientras que las de terceros
 * —bancos, aseguradoras, sus clientes anteriores— salen una o dos
 * veces. Si no se encuentra ninguna, se cae al nombre del archivo, que
 * es mejor que dejar el acta sin identificar al postor.
 */
const FORMA_SOCIETARIA =
  String.raw`S\.?\s?A\.?\s?C\.?|S\.?\s?A\.?\s?A\.?|S\.?\s?R\.?\s?L\.?|E\.?\s?I\.?\s?R\.?\s?L\.?|S\.?\s?A\.?`;

export function razonSocialDeLaOferta(texto: string): string | null {
  const t = texto.replace(/\s+/g, ' ');
  const re = new RegExp(
    String.raw`([A-ZÑÁÉÍÓÚ&'.\- ]{4,70}?\s(?:${FORMA_SOCIETARIA}))(?![A-Za-zÑ])`,
    'g',
  );
  const cuenta = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const n = m[1].replace(/\s+/g, ' ').trim();
    // Dos palabras mínimo: "LA S.A." no es una razón social.
    if (n.split(' ').length < 2) continue;
    // Y no empieza por una preposición arrastrada de la frase anterior.
    if (/^(?:DE|DEL|LA|EL|LOS|LAS|POR|PARA|CON|SEGÚN|SEGUN|ENTRE|SOBRE)\b/.test(n)) continue;
    cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
  }
  if (cuenta.size === 0) return null;
  const [mejor] = [...cuenta].sort((a, b) => b[1] - a[1]);
  return mejor[0];
}

/** El nombre del postor, a partir del archivo, hasta que la oferta diga el suyo. */
