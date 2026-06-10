import { Logo, LogoMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export const metadata = {
  title: 'Styleguide · Dev',
  robots: { index: false, follow: false },
};

const BRAND_SCALE: Array<{ k: string; hex: string }> = [
  { k: '50', hex: '#EAF4FE' },
  { k: '100', hex: '#C5E2FC' },
  { k: '200', hex: '#9CCEFB' },
  { k: '300', hex: '#6FB7F8' },
  { k: '400', hex: '#3FA2F6' },
  { k: '500', hex: '#0583F2' },
  { k: '600', hex: '#0470D1' },
  { k: '700', hex: '#035DAE' },
  { k: '800', hex: '#02488A' },
  { k: '900', hex: '#02335F' },
  { k: '950', hex: '#021D40' },
];

export default function StyleguidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-8 py-12 space-y-16">
        <header className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            LexIA v2 · Design system
          </p>
          <h1 className="font-serif text-5xl tracking-tight">
            Styleguide interno
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Página de referencia para validar la paleta corporativa, tipografía y
            componentes base. Ruta interna, no indexada. Eliminar antes de
            producción final.
          </p>
        </header>

        <Section title="Logos">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-8 flex flex-col items-center justify-center gap-4 bg-white">
              <Logo height={80} priority />
              <p className="text-xs text-muted-foreground font-mono">
                &lt;Logo height={80} /&gt;
              </p>
              <p className="text-xs text-muted-foreground">
                Usar en login, hero del landing, splashes grandes.
              </p>
            </Card>
            <Card className="p-8 flex flex-col items-center justify-center gap-4 bg-white">
              <LogoMark height={40} />
              <p className="text-xs text-muted-foreground font-mono">
                &lt;LogoMark height={40} /&gt;
              </p>
              <p className="text-xs text-muted-foreground">
                Usar en topbar, sidebar, footer y espacios estrechos.
              </p>
            </Card>
          </div>
        </Section>

        <Section title="Paleta corporativa">
          <div className="grid grid-cols-11 gap-1">
            {BRAND_SCALE.map((c) => (
              <div key={c.k} className="space-y-2">
                <div
                  className="aspect-square rounded-md border border-border"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="text-center">
                  <p className="text-[11px] font-mono font-semibold">brand-{c.k}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {c.hex}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Anclas: <span className="font-mono">brand-500 = #0583F2</span> (azul
            principal), <span className="font-mono">brand-950 = #021D40</span>{' '}
            (azul profundo de marca). Fondo blanco puro.
          </p>
        </Section>

        <Section title="Tipografía">
          <Card className="p-8 space-y-6">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Plus Jakarta Sans · UI principal
              </p>
              <p className="text-4xl font-bold tracking-tight">
                La IA a la vanguardia de las contrataciones
              </p>
              <p className="text-2xl font-semibold mt-3">
                Asistente normativo · Generadores · Evaluador
              </p>
              <p className="text-base mt-3 leading-relaxed">
                Texto de párrafo corrido. La IA especializada en Contrataciones
                del Estado del Perú fundamentada en la Ley N° 32069, su
                Reglamento, opiniones del OSCE y resoluciones del Tribunal.
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Texto secundario en muted-foreground. Para metadata y captions.
              </p>
            </div>
            <div className="pt-6 border-t border-border">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Instrument Serif · Títulos editoriales decorativos
              </p>
              <p className="font-serif text-5xl tracking-tight">
                LexIA Contrataciones
              </p>
            </div>
            <div className="pt-6 border-t border-border">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                JetBrains Mono · Código y metadata
              </p>
              <p className="font-mono text-sm">
                Art. 49 Ley 32069 · Opinión 023-2024/DTN · brand-500
              </p>
            </div>
          </Card>
        </Section>

        <Section title="Botones">
          <Card className="p-8 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="glow">Glow CTA</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3 pt-4 border-t border-border">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra large</Button>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button loading>Procesando…</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </Section>

        <Section title="Inputs y badges">
          <Card className="p-8 space-y-6">
            <div className="space-y-2 max-w-md">
              <Label>Etiqueta del campo</Label>
              <Input placeholder="Texto de placeholder" />
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Cumple</Badge>
              <Badge variant="warning">Subsanable</Badge>
              <Badge variant="danger">No cumple</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </Card>
        </Section>

        <Section title="Cards">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-6">
              <Badge className="mb-3">Entidad</Badge>
              <h3 className="font-semibold text-lg mb-1">Generador de TDR</h3>
              <p className="text-sm text-muted-foreground">
                Redacta términos de referencia con sustento normativo y sin
                direccionamiento a marca.
              </p>
            </Card>
            <Card className="p-6">
              <Badge variant="success" className="mb-3">
                Activo
              </Badge>
              <h3 className="font-semibold text-lg mb-1">Chat normativo</h3>
              <p className="text-sm text-muted-foreground">
                Pregunta sobre la Ley 32069, opiniones y pronunciamientos con
                citas verificables.
              </p>
            </Card>
            <Card className="p-6">
              <Badge variant="warning" className="mb-3">
                Trial 30 días
              </Badge>
              <h3 className="font-semibold text-lg mb-1">Evaluador de ofertas</h3>
              <p className="text-sm text-muted-foreground">
                Sube las Bases Integradas y las ofertas de los postores; dictamina
                cumplimiento por requisito.
              </p>
            </Card>
          </div>
        </Section>

        <footer className="pt-12 border-t border-border text-xs text-muted-foreground">
          LexIA v2 · Etapa 1 de la reconstrucción · Ruta interna /dev/styleguide
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-mono uppercase tracking-widest text-brand-600">
        {title}
      </h2>
      {children}
    </section>
  );
}
