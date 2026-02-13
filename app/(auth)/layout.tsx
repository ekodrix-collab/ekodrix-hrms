export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-5">
        <div className="relative hidden overflow-hidden border-r bg-muted/30 lg:col-span-3 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,hsl(var(--primary)/0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,hsl(var(--primary)/0.12),transparent_50%)]" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="text-sm font-medium tracking-wide text-muted-foreground">
              Ekodrix HRMS
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-bold">
                WorkFlow Pro
              </div>
              <p className="max-w-md text-muted-foreground">
                Smart daily planning, attendance, and task execution for small
                teams—built for speed, clarity, and accountability.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Ekodrix
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 lg:col-span-2">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

