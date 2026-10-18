'use client';

import Link from 'next/link';
import { enlaceWhatsApp } from '@/lib/billing/catalogo';
import { useLanding } from './contexto';
import { useAcciones } from './modales';
import { PREGUNTAS } from './datos';
import { Icono } from './iconos';

export function Preguntas() {
  const { track } = useLanding();
  return (
    <section id="faq" className="section section-track faq-section" data-section="faq">
      <div className="section-head">
        <span className="eyebrow">ANTES DE EMPEZAR</span>
        <h2>Respuestas claras.</h2>
      </div>
      <div className="faq-list">
        {PREGUNTAS.map((f, i) => (
          <details
            key={f.pregunta}
            onToggle={(e) => {
              if (e.currentTarget.open) track('faq_open', { question: i + 1 });
            }}
          >
            <summary>{f.pregunta}</summary>
            <p>{f.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LlamadoFinal() {
  const { abrirPrueba } = useAcciones();
  return (
    <section className="final-cta section-track" data-section="cierre">
      <span className="eyebrow">TU PRÓXIMO CASO PUEDE EMPEZAR AQUÍ</span>
      <h2>
        Consulta con respaldo.
        <br />
        Genera con estructura.
        <br />
        <span>Evalúa con sustento.</span>
      </h2>
      <button className="btn" onClick={abrirPrueba}>
        Conoce Prueba A-LexIA <Icono nombre="arrow" />
      </button>
      <div className="cta-row contact-row">
        <a
          className="btn whatsapp-btn"
          href={enlaceWhatsApp('Hola, quisiera solicitar una demostración de A-LexIA.')}
          target="_blank"
          rel="noopener noreferrer"
          data-whatsapp="demostracion"
        >
          <Icono nombre="whatsapp" />
          Solicitar una demostración
        </a>
      </div>
      <p className="micro">Contacto comercial por WhatsApp · +51 968 610 606</p>
    </section>
  );
}

/**
 * Pie de la propuesta. Sin las líneas de prototipo («Propuesta de
 * presentación», «el acceso al software se realiza en la plataforma
 * actual»); a cambio, los enlaces legales que una página real necesita.
 */
export function Pie() {
  const { abrirPreferencias } = useAcciones();
  return (
    <footer>
      {/* eslint-disable-next-line @next/next/no-img-element -- logotipo fijo de la propuesta, medido por CSS */}
      <img src="/landing/logo.webp" alt="A-LexIA Contrataciones" />
      <p>Tu aliado estratégico en el Estado.</p>
      <div>
        <a href="#funciones">Funcionalidades</a>
        <a href="#planes">Planes</a>
        <Link href="/legal/terminos">Términos</Link>
        <Link href="/legal/privacidad">Privacidad</Link>
        <button className="footer-button" id="privacy-settings" onClick={abrirPreferencias}>
          Preferencias de medición
        </button>
      </div>
      <small>© {new Date().getFullYear()} A-LexIA. Todos los derechos reservados.</small>
    </footer>
  );
}

/** WhatsApp flotante y «¿Qué plan me sirve?», que baja al orientador. */
export function Flotantes() {
  const { track } = useLanding();
  return (
    <>
      <a
        className="whatsapp-float"
        href={enlaceWhatsApp('Hola, quisiera información sobre A-LexIA.')}
        target="_blank"
        rel="noopener noreferrer"
        data-whatsapp="flotante"
        aria-label="Contactar a A-LexIA por WhatsApp, abre una nueva pestaña"
      >
        <Icono nombre="whatsapp" />
        <span>¿Necesitas ayuda?</span>
      </a>
      <button
        className="floating-help"
        id="help-button"
        aria-label="Orientación para elegir plan"
        onClick={() => {
          document.getElementById('finder')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          track('help_open');
        }}
      >
        <Icono nombre="chat" />
        <span>¿Qué plan me sirve?</span>
      </button>
    </>
  );
}
