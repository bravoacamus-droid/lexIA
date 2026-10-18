'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { useLanding } from './contexto';
import { useAcciones } from './modales';
import { MODULOS, PERFILES, type Modulo, type Perfil } from './datos';
import { Icono } from './iconos';

/**
 * Pestañas accesibles como en la propuesta: solo la pestaña activa recibe
 * el tabulador y las flechas, Inicio y Fin se mueven entre ellas.
 */
function useTeclasDePestanas<T extends string>(claves: T[], elegir: (c: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const alTeclear = (e: KeyboardEvent, i: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const n = claves.length;
    const j =
      e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
    elegir(claves[j]);
    refs.current[j]?.focus();
  };
  return { refs, alTeclear };
}

const CLAVES_MODULO = Object.keys(MODULOS) as Modulo[];
const CLAVES_PERFIL = Object.keys(PERFILES) as Perfil[];

export function Funcionalidades() {
  const { track } = useLanding();
  const { abrirDemo, abrirMaterial } = useAcciones();
  const [actual, setActual] = useState<Modulo>('consultar');
  const elegir = (m: Modulo) => {
    setActual(m);
    track('module_select', { module: m });
  };
  const { refs, alTeclear } = useTeclasDePestanas(CLAVES_MODULO, elegir);
  const m = MODULOS[actual];
  const indice = CLAVES_MODULO.indexOf(actual);

  return (
    <section id="funciones" className="section-track section" data-section="funciones">
      <div className="section-head">
        <span className="eyebrow">CONSULTAR · GENERAR · EVALUAR</span>
        <h2>¿Qué necesitas resolver hoy?</h2>
        <p>Elige una tarea. Conoce qué aporta A-LexIA y qué información necesitas.</p>
      </div>
      <div className="function-tabs" role="tablist" aria-label="Funcionalidades">
        {CLAVES_MODULO.map((clave, i) => (
          <button
            key={clave}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`module-content-tab-${i}`}
            aria-controls="module-content"
            aria-selected={clave === actual}
            tabIndex={clave === actual ? 0 : -1}
            onClick={() => elegir(clave)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            <Icono nombre={MODULOS[clave].icono} /> {MODULOS[clave].etiqueta}
          </button>
        ))}
      </div>
      <div id="module-content" role="tabpanel" tabIndex={0} aria-labelledby={`module-content-tab-${indice}`}>
        <div className="module-panel">
          <div className="module-copy">
            <span className="icon">
              <Icono nombre={m.icono} />
            </span>
            <h3>{m.titulo}</h3>
            <p>{m.texto}</p>
            <button className="text-button" onClick={() => abrirDemo(actual)}>
              Ver un recorrido ilustrativo <Icono nombre="arrow" />
            </button>
          </div>
          <div className="module-list">
            {m.herramientas.map((h) => (
              <div className="tool-row" key={h.titulo}>
                <div>
                  <h4>{h.titulo}</h4>
                  <p>{h.texto}</p>
                </div>
                <button aria-label={`Ver material de ${h.titulo}`} onClick={() => abrirMaterial(h.material)}>
                  <Icono nombre="arrow" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Perfiles() {
  const { track } = useLanding();
  const [actual, setActual] = useState<Perfil>('proveedor');
  const elegir = (p: Perfil) => {
    setActual(p);
    track('profile_select', { profile: p });
  };
  const { refs, alTeclear } = useTeclasDePestanas(CLAVES_PERFIL, elegir);
  const p = PERFILES[actual];
  const indice = CLAVES_PERFIL.indexOf(actual);

  return (
    <section id="perfil" className="section-track audience-section" data-section="perfiles">
      <div className="section-head">
        <span className="eyebrow">PARA TU FORMA DE TRABAJAR</span>
        <h2>
          Un caso distinto.
          <br />
          Una herramienta para ti.
        </h2>
      </div>
      <div className="audience-tabs" role="tablist" aria-label="Tu perfil">
        {CLAVES_PERFIL.map((clave, i) => (
          <button
            key={clave}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`profile-content-tab-${i}`}
            aria-controls="profile-content"
            aria-selected={clave === actual}
            tabIndex={clave === actual ? 0 : -1}
            onClick={() => elegir(clave)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            {PERFILES[clave].etiqueta}
          </button>
        ))}
      </div>
      <div id="profile-content" role="tabpanel" tabIndex={0} aria-labelledby={`profile-content-tab-${indice}`}>
        <div className="profile-panel">
          <div>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </div>
          <ul>
            {p.puntos.map((t) => (
              <li key={t}>
                <Icono nombre="check" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
