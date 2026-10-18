import { redirect } from 'next/navigation';

/**
 * Los planes viven ahora en la página pública (sección «Tu necesidad define
 * tu plan»). /pricing se conserva solo para no romper enlaces antiguos.
 */
export default function PricingPage() {
  redirect('/#planes');
}
