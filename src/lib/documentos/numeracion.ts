/**
 * Números romanos, para los formatos de César que numeran así: los
 * anexos de menores a 8 UIT y el acta de evaluación.
 */
export function aRomano(n: number): string {
  const tabla: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let resto = n;
  let romano = '';
  for (const [valor, letras] of tabla) {
    while (resto >= valor) {
      romano += letras;
      resto -= valor;
    }
  }
  return romano;
}
