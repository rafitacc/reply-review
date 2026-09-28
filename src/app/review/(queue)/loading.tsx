export default function QueueLoading() {
  return (
    <main
      aria-busy
      aria-label="Loading the review queue"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8"
    >
      <div className="flex flex-col gap-2">
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-5 w-24" />
      </div>
      <div className="flex justify-between gap-3">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-9 w-56" />
      </div>
      {[4, 3].map((rows, group) => (
        <div key={group} className="flex flex-col gap-2">
          <div className="skeleton h-4 w-20" />
          <div className="divide-y divide-base-300 rounded-box border border-base-300">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex justify-between">
                  <div className="skeleton h-5 w-2/5" />
                  <div className="skeleton h-4 w-10" />
                </div>
                <div className="skeleton h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
