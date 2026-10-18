'use client';

import { useAcciones } from './modales';
import { Icono } from './iconos';

/** Portada, con la ventana ilustrativa de «Evaluar», y la franja de fuentes. */
export function Hero() {
  const { abrirPrueba, abrirDemo } = useAcciones();
  return (
    <>
      <section id="inicio" className="hero section-track" data-section="inicio">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="dot" /> IA especializada en contratación pública
          </span>
          <h1>
            Tu trabajo,
            <br />
            con <span>más claridad.</span>
            <br />Y con respaldo.
          </h1>
          <p className="lead">
            Resuelve dudas, prepara documentos y revisa requerimientos, bases y ofertas. Un mismo ecosistema para
            avanzar en tu caso.
          </p>
          <div className="cta-row">
            <button className="btn" onClick={abrirPrueba}>
              Empieza con 20 preguntas <Icono nombre="arrow" />
            </button>
            <a className="btn secondary" href="#funciones">
              Descubre qué puedes hacer
            </a>
          </div>
          <p className="micro">Gratis · 20 preguntas o 30 días, lo que ocurra primero.</p>
          <div className="hero-points">
            <span>
              <Icono nombre="book" /> Fuentes para revisar
            </span>
            <span>
              <Icono nombre="clock" /> Acceso 24/7
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="orb orb-one" />
          <div className="workspace">
            <div className="workspace-bar">
              <span className="mini-mark">A</span> A-LexIA <span className="example-pill">Ejemplo ilustrativo</span>
            </div>
            <div className="workspace-tabs">
              <span>Consultar</span>
              <span>Generar</span>
              <b>Evaluar</b>
            </div>
            <div className="workspace-body">
              <div className="doc-heading">
                <span className="icon">
                  <Icono nombre="check" />
                </span>
                <div>
                  <small>REVISIÓN PREVENTIVA</small>
                  <h3>Antes de presentar tu oferta</h3>
                </div>
              </div>
              <div className="file-pair">
                <span>
                  <Icono nombre="file" /> Bases definitivas
                </span>
                <span>
                  <Icono nombre="file" /> Tu oferta
                </span>
              </div>
              {[
                ['Admisión', 'Revisa los documentos exigidos'],
                ['Calificación', 'Contrasta requisitos y evidencias'],
                ['Evaluación', 'Comprueba los factores aplicables'],
              ].map(([titulo, texto]) => (
                <div className="check-row" key={titulo}>
                  <span className="check-circle">✓</span>
                  <div>
                    <b>{titulo}</b>
                    <small>{texto}</small>
                  </div>
                </div>
              ))}
              <button className="demo-link" onClick={() => abrirDemo('evaluar')}>
                Explorar este recorrido <Icono nombre="arrow" />
              </button>
            </div>
          </div>
          <div className="floating-note">
            <Icono nombre="search" />
            <div>
              <b>Entiende el hallazgo.</b>
              <span>Revisa la evidencia y el sustento.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="source-strip">
        <span>EL RESPALDO DE LAS TRES FUNCIONALIDADES</span>
        <div>
          Ley N.° 32069 y su Reglamento <i /> OECE <i /> Tribunal de Contrataciones Públicas <i /> DGA <i /> Perú
          Compras
        </div>
      </div>
    </>
  );
}
