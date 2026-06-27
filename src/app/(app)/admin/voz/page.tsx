import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall,
  Lock,
  Clock,
  DollarSign,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Auditoría · Llamadas con Abogado Virtual' };

interface CallRow {
  id: string;
  user_id: string;
  status: 'active' | 'completed' | 'failed' | 'deleted';
  voice_id: string;
  duration_seconds: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
  rag_queries_count: number;
  user_rating: number | null;
  started_at: string;
}

interface ConsentRow {
  id: string;
  user_id: string;
  accepted_ip: string | null;
  accepted_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

const USD_TO_PEN = 3.75;

export default async function AdminVozPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = (meProfile as { is_admin?: boolean } | null)?.is_admin === true;
  if (!isAdmin) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-5">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-semibold text-3xl tracking-tight mb-2">
            Solo administradores
          </h1>
          <p className="text-sm text-muted-foreground">
            Esta página es para auditoría del costo y uso de Llamadas con el
            Abogado Virtual.
          </p>
        </Card>
      </div>
    );
  }

  // Admin client para leer todo (bypass RLS)
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ───────────────────────────────────────────────────
  // Métricas globales y del mes en curso
  // ───────────────────────────────────────────────────
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [allCallsRes, consentsRes, monthCallsRes] = await Promise.all([
    admin
      .from('voice_calls')
      .select(
        'id, user_id, status, voice_id, duration_seconds, tokens_in, tokens_out, cost_usd, rag_queries_count, user_rating, started_at',
      )
      .order('started_at', { ascending: false })
      .limit(200),
    admin
      .from('voice_consents')
      .select('id, user_id, accepted_ip, accepted_at')
      .order('accepted_at', { ascending: false })
      .limit(100),
    admin
      .from('voice_calls')
      .select('id, user_id, status, duration_seconds, cost_usd')
      .gte('started_at', monthStart.toISOString()),
  ]);

  const allCalls = (allCallsRes.data || []) as CallRow[];
  const consents = (consentsRes.data || []) as ConsentRow[];
  const monthCalls = (monthCallsRes.data || []) as Array<{
    id: string;
    user_id: string;
    status: string;
    duration_seconds: number | null;
    cost_usd: number | null;
  }>;

  // ───────────────────────────────────────────────────
  // Agregados
  // ───────────────────────────────────────────────────
  const completed = allCalls.filter((c) => c.status === 'completed');

  // Acumulados de TODO el histórico
  const totalDurationSec = completed.reduce(
    (a, c) => a + (c.duration_seconds || 0),
    0,
  );
  const totalCostUSD = completed.reduce((a, c) => a + (c.cost_usd || 0), 0);
  const totalRagQueries = completed.reduce(
    (a, c) => a + (c.rag_queries_count || 0),
    0,
  );

  // Acumulados del mes en curso
  const monthCompleted = monthCalls.filter((c) => c.status === 'completed');
  const monthDurationSec = monthCompleted.reduce(
    (a, c) => a + (c.duration_seconds || 0),
    0,
  );
  const monthCostUSD = monthCompleted.reduce(
    (a, c) => a + (c.cost_usd || 0),
    0,
  );

  // Por usuario
  const byUser = new Map<
    string,
    { calls: number; minutes: number; costUSD: number }
  >();
  for (const c of completed) {
    const cur = byUser.get(c.user_id) || { calls: 0, minutes: 0, costUSD: 0 };
    cur.calls += 1;
    cur.minutes += (c.duration_seconds || 0) / 60;
    cur.costUSD += c.cost_usd || 0;
    byUser.set(c.user_id, cur);
  }
  const topUsers = [...byUser.entries()]
    .sort((a, b) => b[1].costUSD - a[1].costUSD)
    .slice(0, 10);

  // Trae nombres de los topUsers
  const userIds = topUsers.map(([uid]) => uid);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);
  const profilesMap = new Map<string, string>();
  for (const p of (profiles || []) as ProfileRow[]) {
    profilesMap.set(p.id, p.full_name || p.id.slice(0, 8));
  }

  // Ratings
  const ratedCalls = completed.filter((c) => c.user_rating);
  const avgRating =
    ratedCalls.length > 0
      ? ratedCalls.reduce((a, c) => a + (c.user_rating || 0), 0) /
        ratedCalls.length
      : 0;

  return (
    <div className="container max-w-6xl py-6 space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
      </Button>

      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px]">
            <Lock className="h-3 w-3" />
            Solo admin
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            INNOVACIÓN LEGAL
          </Badge>
        </div>
        <h1 className="font-semibold text-3xl tracking-tight">
          Auditoría · Llamadas con el Abogado Virtual
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Costo real, consumo por usuario, calidad y consentimientos. Datos al
          minuto desde Supabase.
        </p>
      </header>

      {/* KPIs del MES en curso */}
      <section className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
          Mes en curso
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            icon={<PhoneCall className="h-4 w-4" />}
            label="Llamadas"
            value={monthCompleted.length.toString()}
          />
          <Kpi
            icon={<Clock className="h-4 w-4" />}
            label="Minutos"
            value={(monthDurationSec / 60).toFixed(1)}
          />
          <Kpi
            icon={<DollarSign className="h-4 w-4" />}
            label="Costo USD"
            value={`$${monthCostUSD.toFixed(2)}`}
          />
          <Kpi
            icon={<DollarSign className="h-4 w-4" />}
            label="Costo PEN"
            value={`S/ ${(monthCostUSD * USD_TO_PEN).toFixed(2)}`}
            highlight
          />
        </div>
      </section>

      {/* KPIs del TODO el histórico */}
      <section className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Histórico (todo el tiempo)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            icon={<PhoneCall className="h-4 w-4" />}
            label="Total llamadas"
            value={completed.length.toString()}
          />
          <Kpi
            icon={<Clock className="h-4 w-4" />}
            label="Total minutos"
            value={(totalDurationSec / 60).toFixed(1)}
          />
          <Kpi
            icon={<DollarSign className="h-4 w-4" />}
            label="Total USD"
            value={`$${totalCostUSD.toFixed(2)}`}
          />
          <Kpi
            icon={<BookOpen className="h-4 w-4" />}
            label="Consultas RAG"
            value={totalRagQueries.toString()}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            icon={<Users className="h-4 w-4" />}
            label="Consentimientos"
            value={consents.length.toString()}
          />
          <Kpi
            icon={<Star className="h-4 w-4" />}
            label="Calificación media"
            value={
              ratedCalls.length > 0
                ? `${avgRating.toFixed(1)} (${ratedCalls.length})`
                : '—'
            }
          />
          <Kpi
            icon={<TrendingUp className="h-4 w-4" />}
            label="Costo/llamada"
            value={
              completed.length > 0
                ? `S/ ${((totalCostUSD * USD_TO_PEN) / completed.length).toFixed(2)}`
                : 'S/ 0.00'
            }
          />
          <Kpi
            icon={<TrendingUp className="h-4 w-4" />}
            label="Duración media"
            value={
              completed.length > 0
                ? `${(totalDurationSec / completed.length / 60).toFixed(1)} min`
                : '—'
            }
          />
        </div>
      </section>

      {/* Top usuarios */}
      <Card className="p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
          Top 10 usuarios por consumo
        </p>
        {topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos aún.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground pb-2 border-b border-border/40">
              <div className="col-span-5">Usuario</div>
              <div className="col-span-2 text-right">Llamadas</div>
              <div className="col-span-2 text-right">Minutos</div>
              <div className="col-span-3 text-right">Costo PEN</div>
            </div>
            {topUsers.map(([uid, stats]) => (
              <div
                key={uid}
                className="grid grid-cols-12 gap-2 text-sm py-1.5 hover:bg-secondary/30 rounded transition-colors"
              >
                <div className="col-span-5 truncate">
                  <p className="font-medium truncate">
                    {profilesMap.get(uid) || uid.slice(0, 8)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {uid.slice(0, 8)}…
                  </p>
                </div>
                <div className="col-span-2 text-right font-mono">
                  {stats.calls}
                </div>
                <div className="col-span-2 text-right font-mono">
                  {stats.minutes.toFixed(1)}
                </div>
                <div className="col-span-3 text-right font-mono font-semibold">
                  S/ {(stats.costUSD * USD_TO_PEN).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Últimas llamadas */}
      <Card className="p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
          Últimas 25 llamadas
        </p>
        {allCalls.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin llamadas aún.</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground pb-2 border-b border-border/40">
              <div className="col-span-3">Fecha</div>
              <div className="col-span-2">Voz</div>
              <div className="col-span-1 text-right">Min</div>
              <div className="col-span-1 text-right">RAG</div>
              <div className="col-span-1 text-right">★</div>
              <div className="col-span-2 text-right">Costo USD</div>
              <div className="col-span-2 text-right">Costo PEN</div>
            </div>
            {allCalls.slice(0, 25).map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 gap-2 text-xs py-1.5 hover:bg-secondary/30 rounded transition-colors"
              >
                <div className="col-span-3 font-mono text-[11px]">
                  {new Date(c.started_at).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="col-span-2 text-muted-foreground">
                  {c.voice_id}
                </div>
                <div className="col-span-1 text-right font-mono">
                  {((c.duration_seconds || 0) / 60).toFixed(1)}
                </div>
                <div className="col-span-1 text-right font-mono">
                  {c.rag_queries_count}
                </div>
                <div className="col-span-1 text-right font-mono">
                  {c.user_rating || '—'}
                </div>
                <div className="col-span-2 text-right font-mono">
                  ${(c.cost_usd || 0).toFixed(4)}
                </div>
                <div className="col-span-2 text-right font-mono font-semibold">
                  S/ {((c.cost_usd || 0) * USD_TO_PEN).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${highlight ? 'bg-brand-50/40 dark:bg-brand-950/30 border-brand-500/30' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={
            highlight
              ? 'text-brand-700 dark:text-brand-400'
              : 'text-muted-foreground'
          }
        >
          {icon}
        </span>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          highlight ? 'text-brand-700 dark:text-brand-400' : ''
        }`}
      >
        {value}
      </p>
    </Card>
  );
}
