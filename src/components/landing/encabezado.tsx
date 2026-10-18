'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAcciones } from './modales';
import { Icono } from './iconos';

/**
 * Cabecera fija de la propuesta. En el celular el menú se despliega con ☰;
 * se cierra al elegir un enlace, con Escape o al volver a pantalla ancha.
 *
 * «Ir a la plataforma» lleva a /login: si la persona ya tiene sesión, el
 * middleware la manda directo a /app, así que no hace falta preguntarlo aquí.
 */
export function Encabezado() {
  const { abrirPrueba } = useAcciones();
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    const alRedimensionar = () => {
      if (innerWidth > 760) setAbierto(false);
    };
    document.addEventListener('keydown', alTeclear);
    window.addEventListener('resize', alRedimensionar);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      window.removeEventListener('resize', alRedimensionar);
    };
  }, [abierto]);

  const cerrarMenu = () => setAbierto(false);

  return (
    <header>
      <a className="brand" href="#inicio" aria-label="A-LexIA inicio">
        {/* eslint-disable-next-line @next/next/no-img-element -- logotipo fijo de la propuesta, medido por CSS */}
        <img src="/landing/logo.webp" alt="A-LexIA Contrataciones" />
      </a>
      <nav id="main-nav" aria-label="Navegación principal" className={abierto ? 'open' : undefined}>
        <a href="#funciones" onClick={cerrarMenu}>
          Funcionalidades
        </a>
        <a href="#explora" onClick={cerrarMenu}>
          Explora A-LexIA
        </a>
        <a href="#planes" onClick={cerrarMenu}>
          Planes
        </a>
      </nav>
      <div className="header-actions">
        <Link className="login" href="/login">
          Ir a la plataforma
        </Link>
        <button className="btn small" onClick={abrirPrueba}>
          Prueba A-LexIA <Icono nombre="arrow" />
        </button>
        <button
          ref={boton}
          className="menu-toggle"
          aria-label="Abrir menú"
          aria-controls="main-nav"
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
