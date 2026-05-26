'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { Mail, User, Building2, Save } from 'lucide-react';

const schema = z.object({
  full_name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  organization: z.string().max(120).optional().or(z.literal('')),
});

type Values = z.infer<typeof schema>;

interface Props {
  email: string;
  initialFullName: string;
  initialOrganization: string;
}

export function SettingsForm({ email, initialFullName, initialOrganization }: Props) {
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialFullName,
      organization: initialOrganization,
    },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          organization: values.organization || null,
        })
        .eq('id', auth.user.id);

      if (error) {
        toast.error('No se pudo guardar', { description: error.message });
      } else {
        toast.success('Perfil actualizado');
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h2 className="font-semibold mb-1">Información de perfil</h2>
        <p className="text-xs text-muted-foreground mb-5">
          Esta información se muestra en tu cuenta y en los documentos que generas.
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Correo electrónico
            </Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={email} disabled className="pl-10 bg-secondary/50" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              El correo está asociado a tu cuenta y no puede cambiarse.
            </p>
          </div>

          <div>
            <Label
              htmlFor="full_name"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Nombre completo
            </Label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="full_name"
                placeholder="César Huamán Oré"
                className="pl-10"
                {...form.register('full_name')}
              />
            </div>
            {form.formState.errors.full_name && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="organization"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Organización <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <div className="relative mt-1.5">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="organization"
                placeholder="Promptive"
                className="pl-10"
                {...form.register('organization')}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          <Save className="h-4 w-4" />
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
