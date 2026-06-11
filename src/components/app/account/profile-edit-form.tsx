'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  initial: {
    full_name: string;
    organization_name: string;
    ruc: string;
    position_title: string;
    profile_role: ProfileRole | null;
  };
}

export function ProfileEditForm({ initial }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [orgName, setOrgName] = useState(initial.organization_name);
  const [ruc, setRuc] = useState(initial.ruc);
  const [positionTitle, setPositionTitle] = useState(initial.position_title);
  const [role, setRole] = useState<ProfileRole | ''>(initial.profile_role || '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!role) {
      toast.error('Selecciona tu perfil');
      return;
    }
    if (!fullName.trim() || !orgName.trim()) {
      toast.error('Nombre y organización son obligatorios');
      return;
    }
    setSaving(true);
    try {
      // Reutilizamos /api/onboarding (mismo schema). El endpoint marca
      // onboarding_completed=true, lo que ya estaba.
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_role: role,
          full_name: fullName.trim(),
          organization_name: orgName.trim(),
          ruc: ruc.trim() || null,
          position_title: positionTitle.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { detail?: string; error?: string })?.detail
            || (data as { error?: string })?.error
            || `HTTP ${res.status}`,
        );
      }
      toast.success('Perfil actualizado');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Row label="Tu nombre">
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={120}
        />
      </Row>

      <Row label="Perfil" hint="Cambiar tu perfil ajusta los módulos visibles en la sidebar.">
        <Select
          value={role || undefined}
          onValueChange={(v) => setRole(v as ProfileRole)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entity">{ROLE_LABELS.entity}</SelectItem>
            <SelectItem value="provider">{ROLE_LABELS.provider}</SelectItem>
            <SelectItem value="consultant">{ROLE_LABELS.consultant}</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row label="Organización">
        <Input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          maxLength={160}
          placeholder="Razón social o entidad"
        />
      </Row>

      <div className="grid sm:grid-cols-2 gap-5">
        <Row label="RUC (opcional)">
          <Input
            value={ruc}
            onChange={(e) =>
              setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))
            }
            inputMode="numeric"
            placeholder="20123456789"
          />
        </Row>
        <Row label="Cargo (opcional)">
          <Input
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
            maxLength={120}
            placeholder="Ej. Subgerente de Logística"
          />
        </Row>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={submit} loading={saving} variant="default">
          <Save className="h-4 w-4" />
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
