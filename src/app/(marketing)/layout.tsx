import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
