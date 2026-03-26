/**
 * Monday.com-style full-page loading skeleton.
 * Used as the Suspense fallback while lazy-loaded pages are being fetched.
 */
export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] flex" dir="rtl" aria-busy="true" aria-label="טוען...">
      {/* Sidebar shimmer */}
      <div className="hidden md:flex flex-col w-[220px] flex-shrink-0 bg-white border-l border-[#E6E9EF] p-3 gap-2">
        {/* Logo area */}
        <div className="h-10 w-32 bg-[#F5F6F8] rounded-xl animate-pulse mb-3" />
        {/* Nav items */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-[4px] animate-pulse bg-[#F5F6F8]"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header shimmer */}
        <div className="h-14 bg-white border-b border-[#E6E9EF] flex items-center px-6 gap-4">
          <div className="h-8 w-48 bg-[#F5F6F8] rounded-[4px] animate-pulse" />
          <div className="flex-1" />
          <div className="h-8 w-8 rounded-full bg-[#F5F6F8] animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-[#F5F6F8] animate-pulse" />
        </div>

        {/* Page body shimmer */}
        <div className="p-6 flex flex-col gap-5 flex-1">
          {/* Page title */}
          <div className="h-8 w-56 bg-[#F5F6F8] rounded-xl animate-pulse" />

          {/* KPI cards row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>

          {/* Content blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] animate-pulse" />
            <div className="h-64 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] animate-pulse" style={{ animationDelay: "80ms" }} />
          </div>

          {/* Bottom block */}
          <div className="h-40 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] animate-pulse" style={{ animationDelay: "120ms" }} />
        </div>
      </div>
    </div>
  );
}
