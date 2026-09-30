import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';
import { BotonWhatsApp } from '@/components/soporte/boton-whatsapp';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-white text-slate-900">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <BotonWhatsApp />
    </div>
  );
}
