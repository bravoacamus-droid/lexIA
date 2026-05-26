'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQS = [
  {
    q: '¿Qué tan precisa es la inteligencia artificial?',
    a: 'LexIA está construida sobre Retrieval-Augmented Generation (RAG): primero busca los fragmentos normativos relevantes en nuestra base, y solo entonces genera la respuesta basándose en ellos. Cada afirmación incluye citaciones verificables [1] [2] [3] que puedes clicar para ver el texto original completo. Si no hay sustento normativo suficiente, te lo dice explícitamente en lugar de inventar.',
  },
  {
    q: '¿Mis consultas son privadas?',
    a: 'Sí. Tus conversaciones, evaluaciones y documentos generados son privados a tu cuenta, protegidos por Row Level Security a nivel de base de datos. Nadie más, ni siquiera otros suscriptores, puede acceder a tu información. Las consultas no se usan para entrenar modelos.',
  },
  {
    q: '¿Qué normativa incluye la base?',
    a: 'Ley N° 32069 (vigente) y TUO de la Ley 30225, su Reglamento (DS 344-2018-EF y modificatorias), Directivas vigentes del OSCE, Opiniones y Pronunciamientos del OSCE de los últimos 3 años, y una selección curada de Resoluciones del Tribunal de Contrataciones del Estado. La base se actualiza continuamente.',
  },
  {
    q: '¿Puedo subir mis propios documentos para que LexIA los analice?',
    a: 'Sí. En el módulo Evaluador puedes subir las Bases Integradas de un proceso y las ofertas de los postores: LexIA compara cada requisito y te entrega una matriz con observaciones, subsanables e incumplimientos, todos con sustento normativo. Los archivos se procesan de forma privada.',
  },
  {
    q: '¿Cuánto cuesta el servicio?',
    a: 'Estamos en fase de demo privada por invitación. Próximamente publicaremos los planes de suscripción para postores, funcionarios, áreas legales y consultoras. Los actuales suscriptores beta tendrán condiciones preferenciales en el lanzamiento.',
  },
  {
    q: '¿Funciona en mobile?',
    a: 'Sí. La interfaz es responsive y funciona en cualquier dispositivo moderno — móvil, tablet o escritorio. Para sesiones largas de evaluación o redacción recomendamos escritorio por comodidad.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-24 border-t border-border">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-brand-700 dark:text-brand-400 mb-3">
            Preguntas frecuentes
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance">
            Todo lo que necesitas saber
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
