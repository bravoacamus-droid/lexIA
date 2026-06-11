import { redirect } from 'next/navigation';

// El hub /cuenta redirige por defecto a /cuenta/perfil.
export const dynamic = 'force-dynamic';

export default function CuentaIndexPage() {
  redirect('/cuenta/perfil');
}
