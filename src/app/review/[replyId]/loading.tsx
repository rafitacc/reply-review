export default function ReviewReplyLoading() {
  return (
    <main
      aria-busy
      aria-label="Loading the reply"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8"
    >
      <div className="skeleton h-5 w-28" />
      <div className="flex flex-col gap-2">
        <div className="skeleton h-7 w-2/3" />
        <div className="skeleton h-5 w-80" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      </div>
    </main>
  );
}
