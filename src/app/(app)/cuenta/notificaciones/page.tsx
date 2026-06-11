import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Notificaciones' };

interface Pref {
  label: string;
  description: string;
  enabledByDefault: boolean;
}

const PREFS: Pref[] = [
  {
    label: 'Resumen semanal de tu actividad',
    description: 'Cada lunes te llega un correo con tu uso de la semana anterior.',
    enabledByDefault: true,
  },
  {
    label: 'Aviso cuando se actualice una norma que citaste',
    description:
      'Te avisamos si la opinión o pronunciamiento que LexIA usó en una respuesta tuya tiene un cambio relevante.',
    enabledByDefault: true,
  },
  {
    label: 'Alertas de cuota próxima a agotarse',
    description:
      'Te enviamos un correo cuando alcanzas el 80% de tu cuota mensual de generaciones o evaluaciones.',
    enabledByDefault: true,
  },
  {
    label: 'Novedades del producto y nuevas funciones',
    description: 'Pocas veces al mes, solo cuando hay algo realmente útil.',
    enabledByDefault: false,
  },
];

export default function NotificacionesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Notificaciones</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Elige qué te avisamos por correo electrónico. Estas preferencias se
          aplican a {' '}
          <strong>todos los correos</strong> excepto los transaccionales
          (recibos de pago, restablecimiento de cuenta y avisos legales).
        </p>
      </header>

      <Card className="divide-y divide-border">
        {PREFS.map((p, i) => (
          <div key={i} className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {p.description}
              </p>
            </div>
            <Badge variant={p.enabledByDefault ? 'success' : 'secondary'}>
              {p.enabledByDefault ? 'Activado' : 'Desactivado'}
            </Badge>
          </div>
        ))}
      </Card>

      <Card className="p-4 bg-secondary/40">
        <p className="text-xs text-muted-foreground leading-relaxed">
          La preferencia editable de notificaciones llega en una próxima
          actualización. Mientras tanto, si quieres dejar de recibir alguno de
          estos correos escríbenos a{' '}
          <a
            href="mailto:hola@promptive.pe"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            hola@promptive.pe
          </a>{' '}
          desde el correo de tu cuenta y lo aplicamos manualmente.
        </p>
      </Card>
    </div>
  );
}
