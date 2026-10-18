/**
 * La página pública trae su propia cabecera, pie y botones flotantes (la
 * propuesta de César, ver `src/components/landing`), así que este grupo ya
 * no envuelve nada.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
