export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Chargement">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-4 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
