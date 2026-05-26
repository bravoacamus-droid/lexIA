import { Hero } from '@/components/marketing/hero';
import { Differentiators } from '@/components/marketing/differentiators';
import { Features } from '@/components/marketing/features';
import { UseCases } from '@/components/marketing/use-cases';
import { Faq } from '@/components/marketing/faq';
import { CtaBanner } from '@/components/marketing/cta-banner';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Differentiators />
      <Features />
      <UseCases />
      <Faq />
      <CtaBanner />
    </>
  );
}
