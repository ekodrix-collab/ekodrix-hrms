// This file is automatically used by Next.js App Router.
// Shows instantly while the admin dashboard page.tsx is loading,
// replacing the blank white screen with a polished skeleton UI.

export default function AdminDashboardLoading() {
  return (
    <div className="bg-[#fafafa] dark:bg-black/95 min-h-screen">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto pb-8">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-4 w-80 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-10 w-36 bg-primary/20 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="flex gap-3 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              </div>
              <div className="h-9 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
              <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-8 border-b border-zinc-100 dark:border-zinc-800 pb-0">
          {["Overview", "Real-time Metrics", "Team Dynamics"].map((tab) => (
            <div key={tab} className="pb-3 border-b-2 border-transparent">
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Main content area skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Chart */}
          <div className="xl:col-span-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-3 w-56 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            </div>
            <div className="h-[280px] w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 animate-pulse" />
          </div>

          {/* Team mood */}
          <div className="xl:col-span-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-6 space-y-4">
            <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                  <div className="h-3 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-6 space-y-4"
            >
              <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-start gap-3 py-1">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                    <div className="h-2.5 w-3/4 bg-zinc-100 dark:bg-zinc-800/60 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
