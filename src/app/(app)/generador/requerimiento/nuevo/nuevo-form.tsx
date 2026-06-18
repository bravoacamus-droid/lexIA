'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles } from 'lucide-react';

type Objeto = 'bien' | 'servicio' | 'obra' | 'consultoria_obra';

export function NuevoRequerimientoForm() {
  const router = useRouter();
  const [anio, setAnio] = useState<number>(new Date().getUTCFullYear());
  const [objeto, setObjeto] = useState<Objeto | ''>('');
  const [areaUsuaria, setAreaUsuaria] = useState('');
  const [denominacion, setDenominacion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!objeto) {
      toast.error('Selecciona el objeto contractual');
      return;
    }
    if (denominacion.trim().length < 5) {
      toast.error('La denominación debe ser más descriptiva');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/requerimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anio,
          objeto,
          area_usuaria: areaUsuaria.trim() || undefined,
          denominacion: denominacion.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'No se pudo crear');
      }
      toast.success('Requerimiento creado');
      router.push(`/generador/requerimiento/${json.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-3xl py-8 space-y-5">
      <header>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/generador/requerimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl tracking-tight">
          Nuevo requerimiento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comencemos con los datos generales. Después podrás construir el Anexo
          con cláusulas marcables y el texto profesionalizado por LexIA.
        </p>
      </header>

      <Card className="p-7 space-y-5">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
          1.1 Datos generales del requerimiento
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nro
            </Label>
            <Input value="(Autogenerado)" disabled className="mt-1.5 bg-secondary/50" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Año <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              min={2024}
              max={2100}
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value || '2026', 10))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Objeto <span className="text-rose-500">*</span>
            </Label>
            <Select value={objeto || undefined} onValueChange={(v) => setObjeto(v as Objeto)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="SELECCIONE" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bien">Bien</SelectItem>
                <SelectItem value="servicio">Servicio</SelectItem>
                <SelectItem value="obra">Obra</SelectItem>
                <SelectItem value="consultoria_obra">Consultoría de Obra</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Área usuaria
          </Label>
          <Input
            value={areaUsuaria}
            onChange={(e) => setAreaUsuaria(e.target.value)}
            placeholder="Ej. Sub Dirección de Tecnologías de Información"
            maxLength={160}
            className="mt-1.5"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Denominación de la contratación{' '}
              <span className="text-rose-500">*</span>
            </Label>
            <span className="text-[10px] font-mono text-muted-foreground">
              {denominacion.length}/500
            </span>
          </div>
          <Textarea
            value={denominacion}
            onChange={(e) => setDenominacion(e.target.value.slice(0, 500))}
            placeholder="Ej. ADQUISICIÓN DE COMPUTADORAS PERSONALES PARA LA DIRECCIÓN ADMINISTRATIVA"
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={submit} size="lg" variant="glow" loading={submitting}>
            <Sparkles className="h-4 w-4" />
            Crear y continuar
          </Button>
        </div>
      </Card>
    </div>
  );
}
