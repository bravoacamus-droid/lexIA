'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, Star, StarOff, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getDocTypeMeta, formatDate, truncate } from '@/lib/utils';
import type { NormativeDocType } from '@/lib/supabase/types';

interface DocumentMini {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
}

interface Props {
  document: DocumentMini;
  excerpt?: string;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
}

export function DocumentCard({
  document,
  excerpt,
  isSaved,
  onSave,
  onUnsave,
}: Props) {
  const meta = getDocTypeMeta(document.type);
  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={cn('border-transparent', meta.bg, meta.color)}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full mr-1"
              style={{ backgroundColor: meta.tagColor }}
            />
            {meta.label}
          </Badge>
          {document.number && (
            <span className="text-xs font-mono text-muted-foreground truncate">
              {document.number}
            </span>
          )}
          {document.date && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(document.date)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isSaved ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onUnsave}
              aria-label="Quitar de la biblioteca"
              className="text-amber-500 hover:text-amber-600"
            >
              <Star className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSave}
              aria-label="Guardar en biblioteca"
              className="text-muted-foreground hover:text-amber-500"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Link href={`/biblioteca/documento/${document.id}`} className="block group/title">
        <h3 className="font-serif text-lg leading-snug tracking-tight group-hover/title:text-brand-700 dark:group-hover/title:text-brand-400 transition-colors">
          {document.title}
        </h3>
      </Link>

      {document.summary && !excerpt && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {document.summary}
        </p>
      )}

      {excerpt && (
        <div className="mt-3 border-l-2 border-brand-500 bg-brand-50/30 dark:bg-brand-950/30 pl-3 py-2 text-sm leading-relaxed">
          <p className="line-clamp-3 text-foreground/85 italic">
            "{truncate(excerpt, 280)}"
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {document.source_url && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <a href={document.source_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              Fuente original
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="subtle">
          <Link href={`/biblioteca/documento/${document.id}`}>
            Abrir
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </motion.article>
  );
}
