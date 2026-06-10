export const metadata = { title: 'Bienvenido a LexIA' };

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-40" />
      <div className="absolute inset-0 -z-10 bg-grid-light dark:bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />
      {children}
    </div>
  );
}
