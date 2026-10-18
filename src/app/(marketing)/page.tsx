import type { Metadata, Viewport } from 'next';
import '@/components/landing/landing.css';
import { LandingProvider } from '@/components/landing/contexto';
import { SpriteDeIconos } from '@/components/landing/iconos';
import { Encabezado } from '@/components/landing/encabezado';
import { Hero } from '@/components/landing/hero';
import { Funcionalidades, Perfiles } from '@/components/landing/funcionalidades';
import { Biblioteca, Galeria } from '@/components/landing/galeria';
import { Orientador, Planes } from '@/components/landing/planes';
import { Flotantes, LlamadoFinal, Pie, Preguntas } from '@/components/landing/cierre';

export const metadata: Metadata = {
  title: { absolute: 'A-LexIA · Consulta, Genera y Evalúa' },
  description:
    'A-LexIA Contrataciones: consulta con respaldo, genera documentos y evalúa requerimientos, bases y ofertas. Conoce las funcionalidades y elige tu plan.',
};

export const viewport: Viewport = { themeColor: '#061a4d' };

/**
 * Página pública de A-LexIA: la propuesta de César (octubre 2026) con sus
 * secciones, textos y orden. Todo vive dentro de `.landing-cesar`, que aísla
 * su hoja de estilos de la de la aplicación (ver landing.css).
 */
export default function LandingPage() {
  return (
    <div className="landing-cesar">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SpriteDeIconos />
      <LandingProvider>
        <Encabezado />
        <main id="contenido">
          <Hero />
          <Funcionalidades />
          <Perfiles />
          <Galeria />
          <Biblioteca />
          <Planes />
          <Orientador />
          <Preguntas />
          <LlamadoFinal />
        </main>
        <Pie />
        <Flotantes />
      </LandingProvider>
      <noscript>
        <p style={{ padding: 24, textAlign: 'center' }}>
          Activa JavaScript para explorar las herramientas, comparar planes y abrir los materiales.
        </p>
      </noscript>
    </div>
  );
}
