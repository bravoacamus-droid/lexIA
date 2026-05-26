'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Library, FileSearch, FileText, Search } from 'lucide-react';
import { Logo } from '@/components/logo';

export function ProductMockup() {
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono ml-2 hidden sm:inline">
            app.lexia.pe/chat
          </span>
        </div>
        <Logo size="sm" />
      </div>

      <div className="grid grid-cols-12 min-h-[400px] sm:min-h-[500px]">
        {/* Sidebar */}
        <aside className="hidden md:flex col-span-3 flex-col gap-1 p-3 border-r border-border bg-secondary/20">
          <div className="px-2 py-1.5 mb-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <MessageSquare className="h-3 w-3" />
              Conversaciones
            </div>
          </div>
          {[
            { title: 'Subsanación de ofertas', active: true },
            { title: 'Plazos para apelaciones' },
            { title: 'Adicionales de obra' },
            { title: 'Penalidades — formulación' },
          ].map((item, i) => (
            <div
              key={i}
              className={`px-2.5 py-1.5 rounded-md text-xs truncate ${
                item.active
                  ? 'bg-brand-100 dark:bg-brand-950 text-brand-900 dark:text-brand-200 font-medium'
                  : 'text-muted-foreground hover:bg-secondary/60'
              }`}
            >
              {item.title}
            </div>
          ))}
          <div className="mt-auto space-y-0.5">
            <div className="px-2.5 py-1.5 rounded-md text-xs text-muted-foreground flex items-center gap-2">
              <Library className="h-3 w-3" /> Biblioteca
            </div>
            <div className="px-2.5 py-1.5 rounded-md text-xs text-muted-foreground flex items-center gap-2">
              <FileSearch className="h-3 w-3" /> Evaluador
            </div>
            <div className="px-2.5 py-1.5 rounded-md text-xs text-muted-foreground flex items-center gap-2">
              <FileText className="h-3 w-3" /> Generador
            </div>
          </div>
        </aside>

        {/* Chat content */}
        <div className="col-span-12 md:col-span-9 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Subsanación de ofertas</span>
          </div>

          {/* User message */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-end"
          >
            <div className="max-w-[80%] bg-secondary rounded-2xl rounded-tr-md px-4 py-2.5 text-sm">
              ¿En qué casos procede la subsanación de ofertas?
            </div>
          </motion.div>

          {/* Assistant message */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex gap-3"
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center">
              <Logo size="sm" showWordmark={false} href={null} />
            </div>
            <div className="flex-1 space-y-2 text-sm leading-relaxed">
              <p>
                Conforme al artículo 64.3 del Reglamento de la Ley de Contrataciones, la
                subsanación procede cuando la información omitida{' '}
                <span className="citation-chip">1</span> existía con anterioridad a la
                presentación de la oferta y no implica modificación sustancial.
              </p>
              <p>
                Los plazos otorgados por el comité son improrrogables y deben constar por
                escrito en el expediente <span className="citation-chip">2</span>.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Fuentes
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Reglamento art. 64.3 · Opinión 023-2024/DTN · Resolución 02156-2023-TCE
                </span>
              </div>
            </div>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-auto pt-2"
          >
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
              <span className="text-sm text-muted-foreground flex-1">
                Pregúntale a LexIA sobre normativa, casos o procedimientos…
              </span>
              <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                ↵
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
