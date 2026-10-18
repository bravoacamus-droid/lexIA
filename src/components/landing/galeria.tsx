'use client';

import { useState } from 'react';
import { enlaceWhatsApp } from '@/lib/billing/catalogo';
import { useLanding } from './contexto';
import { useAcciones } from './modales';
import { normalizar, VIDEOS, type Modulo } from './datos';
import { Icono } from './iconos';

type Filtro = 'todos' | Modulo;

const FILTROS: { clave: Filtro; etiqueta: string }[] = [
  { clave: 'todos', etiqueta: 'Todos' },
  { clave: 'consultar', etiqueta: 'Consultar' },
  { clave: 'generar', etiqueta: 'Generar' },
  { clave: 'evaluar', etiqueta: 'Evaluar' },
];

/**
 * «Mira A-LexIA en acción»: los tres videos grabados de la plataforma, con
 * filtro por funcionalidad y buscador. Los videos no se descargan hasta que
 * se pulsa reproducir (preload="none"): la página no carga 3 MB de entrada.
 */
export function Galeria() {
  const { track } = useLanding();
  const { abrirDemo } = useAcciones();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');

  const tarjetas = VIDEOS.filter(
    (v) =>
      (filtro === 'todos' || v.modulo === filtro) &&
      normalizar(`${v.titulo} ${v.modulo} ${v.descripcion}`).includes(normalizar(busqueda)),
  );

  return (
    <section id="explora" className="section section-track" data-section="galeria">
      <div className="section-head split">
        <div>
          <span className="eyebrow">MÍRALO MÁS DE CERCA</span>
          <h2>Mira A-LexIA en acción.</h2>
        </div>
        <p>
          Videos breves de la plataforma: descubre cómo consultar y revisar bases. Explora también los
          recorridos guiados de sus tres funcionalidades.
        </p>
      </div>
      <div className="media-controls">
        <div className="filter-group" aria-label="Filtrar materiales">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              className={filtro === f.clave ? 'active' : undefined}
              onClick={() => {
                setFiltro(f.clave);
                track('media_filter', { filter: f.clave });
              }}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <button className="text-button" onClick={() => abrirDemo('evaluar')}>
          <Icono nombre="play" /> Ver demo guiada
        </button>
      </div>
      <div className="gallery-search">
        <label htmlFor="media-search">Busca un video</label>
        <input
          id="media-search"
          type="search"
          placeholder="Por ejemplo: consulta o bases"
          autoComplete="off"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value.slice(0, 100))}
        />
        <span id="gallery-count" aria-live="polite">
          {tarjetas.length} videos
        </span>
      </div>
      <div id="gallery" className="gallery">
        {tarjetas.length ? (
          tarjetas.map((v) => (
            <article className="video-card" key={v.id}>
              <div className="video-heading">
                <span className="eyebrow">
                  {v.modulo} · {v.segundos} s
                </span>
                <h3>{v.titulo}</h3>
              </div>
              <video
                controls
                playsInline
                preload="none"
                poster={`/landing/videos/${v.id}.webp`}
                data-video-id={v.id}
                aria-label={v.titulo}
                aria-describedby={`desc-${v.id}`}
              >
                <source src={`/landing/videos/${v.id}.mp4`} type="video/mp4" />
                Tu navegador no permite reproducir este video.{' '}
                <a href={`/landing/videos/${v.id}.mp4`}>Abrir video</a>
              </video>
              <div className="video-copy">
                <p id={`desc-${v.id}`}>{v.descripcion}</p>
                <a
                  className="text-button"
                  href={enlaceWhatsApp(
                    `Hola, vi el video «${v.titulo}» de A-LexIA. Quisiera información y una demostración.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-whatsapp="video"
                  data-video={v.id}
                >
                  Quiero conocer esta herramienta <Icono nombre="arrow" />
                </a>
              </div>
            </article>
          ))
        ) : (
          // «Generar» aún no tiene video grabado: en vez de un «no hay
          // resultados» se ofrece su recorrido guiado.
          <div className="empty-state">
            <h3>{filtro === 'generar' ? 'Conoce cómo generar documentos' : 'No encontramos ese video'}</h3>
            <p>
              {filtro === 'generar'
                ? 'Explora el recorrido guiado de Generar o solicita una demostración por WhatsApp.'
                : 'Prueba con «consulta» o «bases».'}
            </p>
            <button className="btn secondary" onClick={() => abrirDemo('generar')}>
              Explorar Generar
            </button>
          </div>
        )}
      </div>
      <div className="gallery-more">
        <button className="btn secondary" id="gallery-more" hidden>
          Ver más materiales
        </button>
      </div>
      <p className="micro">
        Grabaciones de uso de A-LexIA. Los resultados mostrados corresponden al caso grabado; revisa las fuentes
        y los documentos de tu propio expediente. Los recorridos guiados son ilustrativos.
      </p>
    </section>
  );
}

/** La franja azul de la Biblioteca Normativa. */
export function Biblioteca() {
  return (
    <section className="trust-section section-track" data-section="biblioteca">
      <div className="trust-copy">
        <span className="eyebrow">LA BIBLIOTECA NORMATIVA</span>
        <h2>
          El cerebro que conecta
          <br />
          tu caso con las fuentes.
        </h2>
        <p>
          CONSULTAR, GENERAR y EVALUAR se apoyan en una biblioteca especializada para ayudarte a identificar y
          revisar el respaldo utilizado.
        </p>
        <a href="#faq" className="text-button light">
          Conoce cómo revisar una respuesta <Icono nombre="arrow" />
        </a>
      </div>
      <div className="trust-list">
        {[
          [
            '01',
            'Fuentes identificables',
            'Normas, opiniones, pronunciamientos, resoluciones, directivas y bases estándar disponibles.',
          ],
          ['02', 'Información para tu análisis', 'Relaciona los antecedentes aportados con el sustento pertinente.'],
          ['03', 'Revisión profesional', 'Valida hechos, evidencias y referencias antes de utilizar el resultado.'],
        ].map(([n, titulo, texto]) => (
          <div key={n}>
            <span>{n}</span>
            <p>
              <b>{titulo}</b>
              <small>{texto}</small>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
