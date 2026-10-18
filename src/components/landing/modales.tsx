'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import {
  enlaceWhatsApp,
  planDelCatalogo,
  type IdDePlan,
  type PlanDeCatalogo,
} from '@/lib/billing/catalogo';
import { almacen, useLanding, type FormaDePago } from './contexto';
import { COMPARACION, CONSUMO, DEMOS, MATERIALES, montoEnSoles, type Modulo } from './datos';
import { Icono } from './iconos';

/**
 * El contenido de cada ventana de la propuesta (prueba, plan, solicitud,
 * folleto, demo guiada, comparador, simulador y preferencias).
 *
 * Diferencias con el prototipo, porque esta ya es la página real:
 * - La prueba y los planes ya no mandan a «la plataforma actual»: llevan a
 *   crear la cuenta en /login (si ya hay sesión, el middleware lleva a /app).
 * - No hay cobro en línea: el plan se activa conversando por WhatsApp, así
 *   que la ventana del plan lo dice y conserva sus dos caminos de contacto.
 */

const precioSegun = (p: PlanDeCatalogo, forma: FormaDePago) =>
  p.precioMensual * (forma === 'annual' ? 11 : 1);

export function useAcciones() {
  const { abrir, track, formaDePago } = useLanding();
  return useMemo(
    () => ({
      abrirPrueba() {
        track('trial_interest');
        abrir(<VentanaPrueba />);
      },
      abrirDemo(modulo: Modulo) {
        track('demo_start', { module: modulo });
        abrir(<DemoGuiada modulo={modulo} />);
      },
      abrirMaterial(id: number) {
        track('material_open', { material: id, module: MATERIALES[id - 1].modulo });
        abrir(<VentanaMaterial id={id} />);
      },
      abrirPlan(id: IdDePlan) {
        const plan = planDelCatalogo(id);
        if (plan.prueba) {
          track('trial_interest');
          abrir(<VentanaPrueba />);
          return;
        }
        track('plan_select', { plan: id, billing: formaDePago });
        abrir(<VentanaPlan plan={plan} forma={formaDePago} />);
      },
      abrirComparador() {
        track('comparison_open');
        abrir(<VentanaComparador />);
      },
      abrirCreditos() {
        track('credit_simulator_open');
        abrir(<SimuladorDeCreditos />);
      },
      abrirPreferencias() {
        abrir(<VentanaPreferencias />);
      },
    }),
    [abrir, track, formaDePago],
  );
}

function VentanaPrueba() {
  return (
    <>
      <span className="eyebrow">PRUEBA A-LexIA</span>
      <h2>Tu primer caso empieza con una pregunta.</h2>
      <p>
        Prueba A-LexIA incluye <b>20 preguntas por texto o 30 días</b>, lo que ocurra primero, una sola vez por
        usuario. Sin acceso gratuito renovado cada mes.
      </p>
      <div className="demo-step">
        <h3>¿Qué puedes preguntar?</h3>
        <p>
          Describe tu rol, los hechos y la duda que necesitas aclarar. Pide orientación y referencias para
          revisar.
        </p>
      </div>
      <Link className="btn" href="/login" data-external="trial">
        Crear mi cuenta y empezar <Icono nombre="arrow" />
      </Link>
    </>
  );
}

function VentanaMaterial({ id }: { id: number }) {
  const { track, cerrar } = useLanding();
  const { modulo, titulo } = MATERIALES[id - 1];
  return (
    <>
      <span className="eyebrow">{modulo}</span>
      <h2>{titulo}</h2>
      <p>Conoce el problema que atiende esta herramienta y cómo puede ayudarte.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- el folleto se muestra a su tamaño natural, como en la propuesta */}
      <img className="flyer" src={`/landing/funcion-${id}.webp`} alt={titulo} />
      <p>
        <a className="text-button" href={`/landing/funcion-${id}.webp`} download={`A-LexIA-funcion-${id}.webp`}>
          Descargar este material ↓
        </a>
      </p>
      <a
        className="btn"
        href="#planes"
        id="media-to-plans"
        onClick={() => {
          track('media_to_plans', { material: id });
          cerrar();
        }}
      >
        Ver planes
      </a>
    </>
  );
}

function DemoGuiada({ modulo }: { modulo: Modulo }) {
  const { track, cerrar } = useLanding();
  const [paso, setPaso] = useState(0);
  const [titulo, texto] = DEMOS[modulo][paso];
  return (
    <>
      <span className="eyebrow">DEMO GUIADA · {modulo}</span>
      <h2>Así se desarrolla una tarea</h2>
      <p>Recorrido ilustrativo. No ejecuta IA ni carga un expediente real.</p>
      <div className="demo-step">
        <small>PASO {paso + 1} DE 3</small>
        <h3>{titulo}</h3>
        <p>{texto}</p>
        <div className="demo-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === paso ? 'active' : ''} />
          ))}
        </div>
      </div>
      <div className="step-controls">
        <button
          className="btn secondary"
          id="demo-prev"
          disabled={paso === 0}
          onClick={() => {
            setPaso(paso - 1);
            track('demo_step', { module: modulo, step: paso });
          }}
        >
          Anterior
        </button>
        <button
          className="btn"
          id="demo-next"
          onClick={() => {
            if (paso === 2) {
              track('demo_complete', { module: modulo });
              cerrar();
              document.getElementById('planes')?.scrollIntoView();
            } else {
              setPaso(paso + 1);
              track('demo_step', { module: modulo, step: paso + 2 });
            }
          }}
        >
          {paso === 2 ? 'Ver planes' : 'Siguiente'} <Icono nombre="arrow" />
        </button>
      </div>
    </>
  );
}

function VentanaPlan({ plan: p, forma }: { plan: PlanDeCatalogo; forma: FormaDePago }) {
  const { abrir, track } = useLanding();
  const [estado, setEstado] = useState('');
  const precio = precioSegun(p, forma);
  const periodo = forma === 'annual' ? 'año' : 'mes';
  const usuarios = p.usuarios === 1 ? '1 usuario' : `hasta ${p.usuarios} usuarios`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(
        `Me interesa A-LexIA ${p.nombre}: S/ ${precio} por ${periodo}, ${p.creditosMes} créditos mensuales y hasta ${p.usuarios} usuario(s). Quiero información sobre acceso y condiciones.`,
      );
      setEstado('Selección copiada. Puedes compartirla con el equipo de A-LexIA.');
      track('plan_copy', { plan: p.id });
    } catch {
      setEstado('Tu selección está visible arriba para compartirla.');
    }
  }

  return (
    <>
      <span className="eyebrow">TU SELECCIÓN</span>
      <h2>A-LexIA {p.nombre}</h2>
      <div className="selection-box">
        <strong>
          {p.desde ? 'Desde ' : ''}S/ {montoEnSoles(precio)}
        </strong>{' '}
        /{periodo}
        <p>
          {p.creditosMes} créditos renovados mensualmente · {usuarios}
        </p>
      </div>
      <p>
        {p.descripcion} El plan se activa coordinando con el equipo de A-LexIA por WhatsApp; crea tu cuenta para
        tenerla lista.
      </p>
      <Link className="btn" href="/login" data-external="plan">
        Crear mi cuenta <Icono nombre="arrow" />
      </Link>
      <button className="text-button" id="copy-plan" style={{ marginLeft: 15, marginRight: 15 }} onClick={copiar}>
        Copiar mi selección
      </button>
      <a
        className="btn whatsapp-btn"
        href={enlaceWhatsApp(
          `Hola, me interesa el plan A-LexIA ${p.nombre}, modalidad ${forma === 'annual' ? 'anual' : 'mensual'}. Quisiera conocer sus funcionalidades, créditos y condiciones.`,
        )}
        target="_blank"
        rel="noopener noreferrer"
        data-whatsapp="plan"
        data-plan={p.id}
        style={{ marginTop: 15 }}
      >
        Consultar este plan por WhatsApp
      </a>
      <button
        className="btn secondary"
        id="request-plan"
        style={{ marginTop: 15 }}
        onClick={() => abrir(<VentanaSolicitud plan={p} forma={forma} />)}
      >
        Preparar solicitud de información
      </button>
      <p className="micro" id="copy-status">
        {estado}
      </p>
    </>
  );
}

function VentanaSolicitud({ plan: p, forma }: { plan: PlanDeCatalogo; forma: FormaDePago }) {
  const { track } = useLanding();
  const [perfil, setPerfil] = useState('Como proveedor o contratista');
  const [tarea, setTarea] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estado, setEstado] = useState('');

  function preparar(e: FormEvent) {
    e.preventDefault();
    const t = tarea.trim();
    const texto = `Me interesa el plan A-LexIA ${p.nombre}, en modalidad ${forma === 'annual' ? 'anual' : 'mensual'} (S/ ${precioSegun(p, forma)}${p.desde ? ' como precio base' : ''}). Lo usaría ${perfil.toLowerCase()}. ${t ? 'Quiero conocer: ' + t + '. ' : ''}Solicito información sobre acceso, créditos y condiciones, y una demostración según mi necesidad.`;
    setMensaje(texto);
    setEstado('');
    track('request_prepared', { plan: p.id, billing: forma });
  }

  async function copiar() {
    if (!mensaje) return;
    try {
      await navigator.clipboard.writeText(mensaje);
      setEstado('Mensaje copiado. Compártelo con tu contacto de A-LexIA.');
      track('request_copy', { plan: p.id, billing: forma });
    } catch {
      setEstado('No se pudo copiar. Puedes seleccionar el texto o descargarlo.');
    }
  }

  function descargar() {
    if (!mensaje) return;
    const url = URL.createObjectURL(new Blob([mensaje], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solicitud-informacion-A-LexIA.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track('request_download', { plan: p.id });
  }

  return (
    <>
      <span className="eyebrow">SIGUIENTE PASO · {p.nombre}</span>
      <h2>Prepara tu solicitud de información</h2>
      <p>
        Elige tu perfil y describe la tarea que te interesa. Podrás copiar o descargar el mensaje para
        compartirlo con el equipo de A-LexIA. Podrás abrir WhatsApp con tu mensaje y enviarlo cuando lo decidas.
      </p>
      <form id="request-form" onSubmit={preparar}>
        <label>
          ¿Cómo usarías A-LexIA?
          <select id="request-profile" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
            <option>Como proveedor o contratista</option>
            <option>Como servidor de una entidad</option>
            <option>Como consultor externo</option>
            <option>Para un equipo u organización</option>
          </select>
        </label>
        <label>
          ¿Qué necesitas conocer?
          <textarea
            id="request-task"
            maxLength={600}
            rows={3}
            placeholder="Por ejemplo: revisar nuestras ofertas antes de presentarlas"
            value={tarea}
            onChange={(e) => setTarea(e.target.value)}
          />
        </label>
        <button type="submit" className="btn">
          Preparar mensaje
        </button>
      </form>
      <div id="request-result" aria-live="polite">
        {mensaje && (
          <>
            <div className="request-preview">{mensaje}</div>
            <div className="cta-row">
              <a
                className="btn whatsapp-btn"
                href={enlaceWhatsApp(mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                data-whatsapp="solicitud"
                data-plan={p.id}
              >
                Continuar por WhatsApp
              </a>
              <button className="btn" id="request-copy" onClick={copiar}>
                Copiar mensaje
              </button>
              <button className="btn secondary" id="request-download" onClick={descargar}>
                Descargar mensaje
              </button>
            </div>
            <p className="micro" id="request-status">
              {estado}
            </p>
          </>
        )}
      </div>
    </>
  );
}

function VentanaComparador() {
  return (
    <>
      <span className="eyebrow">COMPARA EL ALCANCE</span>
      <h2>Herramientas según tu plan</h2>
      <div style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Herramienta</th>
              <th>Consulta</th>
              <th>Profesional</th>
              <th>Especialista</th>
            </tr>
          </thead>
          <tbody>
            {COMPARACION.map((fila) => (
              <tr key={fila[0]}>
                {fila.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Equipos y Organizaciones incluyen las funciones de Especialista para sus usuarios, con bolsa compartida.
        Todos los usos consumen créditos.
      </p>
    </>
  );
}

function SimuladorDeCreditos() {
  const [cantidades, setCantidades] = useState(() => CONSUMO.map((c) => String(c.inicial)));
  const total = CONSUMO.reduce(
    (t, c, i) => t + Math.max(0, Math.min(10000, Number(cantidades[i]) || 0)) * c.tarifa,
    0,
  );
  return (
    <>
      <span className="eyebrow">EJEMPLO DE CONSUMO</span>
      <h2>Combina tus tareas</h2>
      <p>
        Estimación orientativa de créditos. Los expedientes extensos requieren un cálculo específico antes de
        procesar.
      </p>
      <div className="consumption">
        {CONSUMO.map((c, i) => (
          <label key={c.etiqueta}>
            {c.etiqueta}
            <input
              type="number"
              min={0}
              max={10000}
              value={cantidades[i]}
              data-rate={c.tarifa}
              onChange={(e) => setCantidades((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
            />
          </label>
        ))}
      </div>
      <div className="credit-result" id="credit-total">
        Consumo ilustrativo: {total.toLocaleString('es-PE')} créditos.
      </div>
      <p className="micro">
        Una misma bolsa cubre todas las herramientas habilitadas. Este simulador no ejecuta tareas ni confirma
        el costo de un expediente real.
      </p>
    </>
  );
}

function VentanaPreferencias() {
  const { fijarConsentimiento } = useLanding();
  const [estado, setEstado] = useState('');
  return (
    <>
      <span className="eyebrow">TUS PREFERENCIAS</span>
      <h2>Decide si medimos tu recorrido</h2>
      <p>
        Esta versión registra eventos de navegación únicamente en este navegador cuando lo permites. No
        registra el contenido de tus documentos ni de las solicitudes de información.
      </p>
      <div className="cta-row">
        <button
          className="btn"
          id="allow-measure"
          onClick={() => {
            fijarConsentimiento('yes');
            setEstado('Medición permitida.');
          }}
        >
          Permitir medición
        </button>
        <button
          className="btn secondary"
          id="stop-measure"
          onClick={() => {
            fijarConsentimiento('no');
            setEstado('La medición está desactivada.');
          }}
        >
          No medir
        </button>
        <button
          className="btn secondary"
          id="erase-measure"
          onClick={() => {
            almacen.borrar('alexia_events');
            setEstado('Eventos de este navegador eliminados.');
          }}
        >
          Borrar eventos locales
        </button>
      </div>
      <p aria-live="polite" id="privacy-status" className="micro">
        {estado}
      </p>
    </>
  );
}
