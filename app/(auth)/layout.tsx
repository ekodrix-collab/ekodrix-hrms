export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_-6%,hsl(var(--muted)/0.85),transparent_42%),radial-gradient(circle_at_94%_8%,hsl(var(--muted)/0.58),transparent_35%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-white/55 p-10 lg:flex lg:flex-col lg:justify-between dark:border-white/10">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              Ekodrix Workspace
            </div>
            <div className="space-y-4">
              <h1 className="max-w-lg text-4xl font-black leading-tight text-zinc-900 dark:text-zinc-100">
                Human-first operations, built for calm focus.
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                Manage attendance, execution, and team workflows in one modern command center designed for speed and comfort.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="surface-card p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Why teams stay</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Mobile-ready flows, low cognitive load, and clean information hierarchy for daily use.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">(c) {new Date().getFullYear()} Ekodrix</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </div>
  );
}
