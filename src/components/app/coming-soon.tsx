'use client';

import { motion } from 'framer-motion';
import { Hammer } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="container max-w-3xl py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-5">
            <Hammer className="h-6 w-6" />
          </span>
          <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground max-w-md mx-auto text-balance">
              {description}
            </p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
