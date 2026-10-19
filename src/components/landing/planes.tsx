'use client';

import { useState, type FormEvent } from 'react';
import { PLANES, planDelCatalogo, precioAnual, type PlanDeCatalogo } from '@/lib/billing/catalogo';
import { useLanding } from './contexto';
import { useAcciones } from './modales';
import { montoEnSoles } from './datos';
import { Icono } from './iconos';

/**
 * «Tu necesidad define tu plan». Precios, créditos y características salen
 * del catálogo compartido con la aplicación (`@/lib/billing/catalogo`). El
 * anual cuesta 11 mensualidades y los créditos se siguen renovando cada mes.
 */
export function Planes() {
  const { formaDePago, setFormaDePago, categoria, setCategoria, track } = useLanding();
  const { abrirPlan, abrirComparador, abrirCreditos } = useAcciones();
  const anual = formaDePago === 'annual';
  const lista = PLANES.filter((p) => (categoria === 'personal' ? !p.empresas : p.empresas));

  return (
    <section id="planes" className="section section-track" data-section="planes">
      <div className="section-head">
        <span className="eyebrow">ELIGE CÓMO AVANZAR</span>
        <h2>Tu necesidad define tu plan.</h2>
        <p>Funcionalidades distintas y una bolsa de créditos para el uso que necesitas.</p>
      </div>
      <div className="pricing-toolbar">
        <div className="segmented" aria-label="Categoría">
          <button
            className={categoria === 'personal' ? 'active' : undefined}
            onClick={() => {
              setCategoria('personal');
              track('plan_category', { category: 'personal' });
            }}
          >
            Personal
          </button>
          <button
            className={categoria === 'business' ? 'active' : undefined}
            onClick={() => {
              setCategoria('business');
              track('plan_category', { category: 'business' });
            }}
          >
            Empresas y entidades
          </button>
        </div>
        <div className="billing-switch" aria-label="Forma de pago">
          <button
            className={!anual ? 'active' : undefined}
            onClick={() => {
              setFormaDePago('monthly');
              track('billing_select', { billing: 'monthly' });
            }}
          >
            Mensual
          </button>
          <button
            className={anual ? 'active' : undefined}
            onClick={() => {
              setFormaDePago('annual');
              track('billing_select', { billing: 'annual' });
            }}
          >
            Anual <span>Ahorra 8,33%</span>
          </button>
        </div>
      </div>

      <div id="pricing" className={categoria === 'business' ? 'pricing business-pricing' : 'pricing'}>
        {lista.map((p) => (
          <TarjetaDePlan key={p.id} plan={p} anual={anual} onElegir={() => abrirPlan(p.id)} />
        ))}
      </div>

      <div className="pricing-bottom">
        <p>
          Precios finales, incluido IGV cuando corresponda. Los créditos se renuevan cada mes, también en el plan
          anual.
        </p>
        <button className="text-button" id="compare-button" onClick={abrirComparador}>
          Comparar funcionalidades <Icono nombre="arrow" />
        </button>
      </div>
      <details className="credits-details">
        <summary>¿Cómo funcionan los créditos y los límites?</summary>
        <div>
          <p>
            La suscripción habilita herramientas. Los créditos permiten utilizarlas y se comparten entre todas las
            tareas del plan. Una evaluación extensa puede consumir más que una consulta.
          </p>
          <p>
            Las operaciones documentales máximas no son cupos adicionales gratuitos. Las recargas amplían saldo,
            pero no desbloquean funciones ni eliminan los límites del plan, y vencen a los 30 días calendario de
            activadas. En equipos, la bolsa se comparte entre los usuarios.
          </p>
          <button className="text-button" id="credits-button" onClick={abrirCreditos}>
            Explorar ejemplos de consumo →
          </button>
        </div>
      </details>
    </section>
  );
}

function TarjetaDePlan({ plan: p, anual, onElegir }: { plan: PlanDeCatalogo; anual: boolean; onElegir: () => void }) {
  const total = precioAnual(p);
  return (
    <article className={`price-card ${p.recomendado ? 'featured' : ''}`} data-plan-card={p.id}>
      {p.recomendado && <span className="ribbon">Recomendado</span>}
      <span className="kind">{p.tipo}</span>
      <h3>{p.nombre}</h3>
      <p className="description">{p.descripcion}</p>
      <div className="price">
        {p.prueba ? (
          'Gratis'
        ) : (
          <>
            {p.desde ? 'Desde ' : ''}S/ {montoEnSoles(anual ? total : p.precioMensual)}{' '}
            <small>/{anual ? 'año' : 'mes'}</small>
          </>
        )}
      </div>
      <p className="bill-note">
        {p.prueba
          ? '20 preguntas o 30 días.'
          : anual
            ? `Pago anticipado · equivale a S/ ${montoEnSoles(total / 12)}/mes`
            : 'Pago mensual anticipado.'}
      </p>
      <div className="quota">
        {p.prueba
          ? 'Una prueba · 1 usuario'
          : `${montoEnSoles(p.creditosMes)} créditos/mes · ${p.usuarios === 1 ? '1 usuario' : `hasta ${p.usuarios} usuarios`}`}
      </div>
      <ul>
        {p.caracteristicas.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <button className={`btn ${p.recomendado ? '' : 'secondary'}`} data-plan={p.id} onClick={onElegir}>
        {p.prueba ? 'Conocer la prueba' : p.empresas ? 'Solicitar información' : 'Elegir este plan'}
      </button>
    </article>
  );
}

/** «Encuentra tu punto de partida»: dos preguntas y una recomendación. */
export function Orientador() {
  const { setCategoria, track } = useLanding();
  const [usuarios, setUsuarios] = useState('1');
  const [tarea, setTarea] = useState('consulta');
  const [recomendado, setRecomendado] = useState<PlanDeCatalogo | null>(null);

  function recomendar(e: FormEvent) {
    e.preventDefault();
    // El tamaño del equipo manda sobre la tarea: un equipo de 5 necesita
    // Equipos aunque solo vaya a consultar.
    const id = usuarios === '10' ? 'organizaciones' : usuarios === '5' ? 'equipos' : tarea;
    const p = planDelCatalogo(id);
    setRecomendado(p);
    setCategoria(p.empresas ? 'business' : 'personal');
    track('plan_recommendation', { plan: id, users: usuarios, task: tarea });
  }

  return (
    <section className="plan-finder section-track" data-section="orientador">
      <div>
        <span className="eyebrow">¿NO SABES POR DÓNDE EMPEZAR?</span>
        <h2>Encuentra tu punto de partida.</h2>
        <p>Dos preguntas para orientarte hacia un plan.</p>
      </div>
      <form id="finder" onSubmit={recomendar}>
        <label>
          ¿Para cuántas personas?
          <select id="finder-users" value={usuarios} onChange={(e) => setUsuarios(e.target.value)}>
            <option value="1">Solo para mí</option>
            <option value="5">Equipo de hasta 5 personas</option>
            <option value="10">Organización de hasta 10 personas</option>
          </select>
        </label>
        <label>
          ¿Qué necesitas principalmente?
          <select id="finder-task" value={tarea} onChange={(e) => setTarea(e.target.value)}>
            <option value="consulta">Resolver dudas y tareas ocasionales de contratos menores</option>
            <option value="profesional">Revisar bases y preparar o comprobar mi oferta</option>
            <option value="especialista">Documentos contractuales o evaluación especializada</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Ver recomendación <Icono nombre="arrow" />
        </button>
        <div id="finder-result" aria-live="polite">
          {recomendado && (
            <>
              <b>Tu punto de partida: {recomendado.nombre}.</b> {recomendado.descripcion}{' '}
              <a href="#planes">Revisa alcance y créditos →</a>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
