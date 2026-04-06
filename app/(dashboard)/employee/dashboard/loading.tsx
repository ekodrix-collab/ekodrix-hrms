// This file is automatically used by Next.js App Router.
// It shows INSTANTLY while the page.tsx component is loading,
// replacing the blank white screen with a polished skeleton UI.

export default function EmployeeDashboardLoading() {
  return (
    <div className="bg-[#fafafa] dark:bg-black/95 min-h-screen">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto pb-8 pt-6">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-10 w-60 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-4 w-80 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5 space-y-3"
            >
              <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content area skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Standup card */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-6 space-y-4">
            <div className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-3 w-52 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              <div className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            </div>
            <div className="h-11 w-full rounded-xl bg-primary/20 animate-pulse" />
          </div>

          {/* Team presence card */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/20 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                    <div className="h-3 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-12 rounded-full bg-green-100 dark:bg-green-900/20 animate-pulse" />
              </div>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-5 space-y-3">
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                    <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
