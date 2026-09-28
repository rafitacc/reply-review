export default function BrandLoading() {
  return (
    <main aria-busy aria-label="Loading the brand summary" className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <div className="flex justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-5 w-64" />
        </div>
        <div className="skeleton h-9 w-56" />
      </div>
      <div className="skeleton h-28 w-full" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-56 w-full" />
    </main>
  );
}
