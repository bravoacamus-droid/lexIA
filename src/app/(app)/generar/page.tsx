import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FilePlus2,
  ClipboardList,
  FileSignature,
  Package,
  Wrench,
  Compass,
  HardHat,
  Clock,
  BarChart3,
  AlertTriangle,
  FileX2,
  MoreHorizontal,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRole } from '@/lib/auth/session';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
  TarjetaDeHerramienta,
  BandaDeConfianza,
} from '@/components/app/seccion/piezas';
import { catalogoPlantillas } from '@/lib/generadores/plantillas';
import { GENERATOR_PERFILES, type GeneratorPerfil } from '@/lib/ai/generator-perfiles';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Generar' };

interface Borrador {
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
  familia: 'requerimiento' | 'documento';
  actualizado: string;
}

function cuando(iso: string): string {
  const f = new Date(iso);
  const hoy = new Date();
  const hora = f.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (f.toDateString() === hoy.toDateString()) return `hoy, ${hora}`;
  if (new Date(hoy.getTime() - 86400_000).toDateString() === f.toDateString())
    return `ayer, ${hora}`;
  return f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function GenerarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const rol = (profile?.profile_role as ProfileRole | null) || null;
  const puedeRequerimiento = rol === 'entity' || rol === 'consultant' || rol === null;

  // ── Lo que quedó a medias, de las dos fuentes a la vez ──
  const [{ data: reqs }, { data: docs }] = await Promise.all([
    puedeRequerimiento
      ? supabase
          .from('requerimientos_plantilla')
          .select('id, plantilla_id, denominacion, status, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from('generator_conversations')
      .select('id, title, perfil, updated_at, generator_messages(count)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);

  const nombreDePlantilla = new Map(catalogoPlantillas().map((p) => [p.id, p.titulo]));

  const borradores: Borrador[] = [
    ...((reqs || []) as Array<{
      id: string;
      plantilla_id: string;
      denominacion: string | null;
      status: string | null;
      updated_at: string;
    }>).map((r) => ({
      id: `req-${r.id}`,
      titulo: r.denominacion?.trim() || 'Requerimiento sin denominación',
      subtitulo: nombreDePlantilla.get(r.plantilla_id) || 'Requerimiento',
      href: `/generador/requerimiento-plantilla/${r.id}`,
      familia: 'requerimiento' as const,
      actualizado: r.updated_at,
    })),
    ...((docs || []) as Array<{
      id: string;
      title: string | null;
      perfil: GeneratorPerfil;
      updated_at: string;
      generator_messages: Array<{ count: number }>;
    }>)
      .filter((d) => (d.generator_messages?.[0]?.count ?? 0) > 0 && GENERATOR_PERFILES[d.perfil])
      .map((d) => ({
        id: `doc-${d.id}`,
        titulo: d.title?.trim() || 'Documento sin título',
        subtitulo: GENERATOR_PERFILES[d.perfil]?.label || 'Documento administrativo',
        href: `/generador/chat/${d.id}`,
        familia: 'documento' as const,
        actualizado: d.updated_at,
      })),
  ]
    .sort((a, b) => +new Date(b.actualizado) - +new Date(a.actualizado))
    .slice(0, 4);

  return (
    <Pagina>
      <MigaDePan trozos={[{ label: 'Inicio', href: '/app' }, { label: 'Generar' }]} />

      <EncabezadoDeSeccion
        icono={FilePlus2}
        familia="generar"
        etiqueta="Generar"
        titulo="¿Qué necesitas elaborar?"
        bajada="A-LexIA te guía paso a paso para crear documentos de contratación pública con sustento normativo y buenas prácticas."
        aside={
          <NotaDelCompanero icono={Lightbulb} familia="generar">
            De la necesidad al documento, con respaldo normativo.
          </NotaDelCompanero>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {puedeRequerimiento && (
          <TarjetaDeHerramienta
            href="/generador/requerimiento-plantilla"
            icono={ClipboardList}
            familia="generar"
            titulo="Requerimientos"
            descripcion="Construye tu requerimiento paso a paso, conforme a la normativa vigente y sobre los quince formatos oficiales."
            llamada="Crear requerimiento"
            pastillas={[
              { icono: Package, texto: 'Bienes' },
              { icono: Wrench, texto: 'Servicios' },
              { icono: Compass, texto: 'Consultoría de obras' },
              { icono: HardHat, texto: 'Ejecución de obras' },
            ]}
          />
        )}
        <TarjetaDeHerramienta
          href="/generador"
          icono={FileSignature}
          familia="generar"
          acabado="suave"
          titulo="Documentos de ejecución contractual"
          descripcion="Elabora documentos administrativos, técnicos y técnico-legales para sustentar actuaciones durante la ejecución del contrato."
          llamada="Crear documento"
          className="border-amber-200/80 dark:border-amber-900/50"
          pastillas={[
            { icono: Clock, texto: 'Ampliaciones' },
            { icono: BarChart3, texto: 'Adicionales' },
            { icono: AlertTriangle, texto: 'Penalidades' },
            { icono: FileX2, texto: 'Resolución' },
            { icono: MoreHorizontal, texto: 'y más' },
          ]}
        />
      </div>

      {borradores.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <header className="flex items-center gap-2.5">
            <Clock className="h-4.5 w-4.5 text-generar-500" strokeWidth={2} />
            <h2 className="text-[15px] font-bold tracking-tight">Continuar donde lo dejaste</h2>
            <Link
              href={puedeRequerimiento ? '/generador/requerimiento-plantilla' : '/generador'}
              className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-generar-600 hover:underline dark:text-generar-400"
            >
              Ver todos mis borradores
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          <ul className="mt-3 space-y-2">
            {borradores.map((b) => (
              <li key={b.id}>
                <Link
                  href={b.href}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3.5 py-3 transition-colors hover:border-generar-300 hover:bg-generar-50/60 dark:hover:border-generar-800 dark:hover:bg-generar-900/20"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-generar-500/12">
                    {b.familia === 'requerimiento' ? (
                      <ClipboardList className="h-4 w-4 text-generar-600 dark:text-generar-400" />
                    ) : (
                      <FileSignature className="h-4 w-4 text-generar-600 dark:text-generar-400" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{b.titulo}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {b.subtitulo} · Última edición: {cuando(b.actualizado)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-generar-200 px-3 py-1.5 text-[12.5px] font-semibold text-generar-700 transition-colors group-hover:bg-generar-500 group-hover:text-white sm:inline-flex dark:border-generar-800 dark:text-generar-300">
                    Continuar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BandaDeConfianza
        texto="Documentos alineados a la normativa vigente: A-LexIA aplica la Ley N.° 32069, su reglamento y demás normas relacionadas."
        lemas={[]}
      />
    </Pagina>
  );
}
