export default function FeedbackLoading() {
  return (
    <main aria-busy aria-label="Loading your feedback" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-5 w-80" />
      </div>
      <div className="flex justify-between gap-3">
        <div className="skeleton h-9 w-56" />
        <div className="skeleton h-9 w-56" />
      </div>
      <div className="skeleton h-28 w-full" />
      <div className="divide-y divide-base-300 rounded-box border border-base-300">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex justify-between">
              <div className="skeleton h-5 w-2/5" />
              <div className="skeleton h-6 w-10" />
            </div>
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
