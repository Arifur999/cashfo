import Loader from "./Loader";

// What every route's loading.tsx returns, so a slow Server Component render
// shows a consistent placeholder inside the dashboard shell instead of a
// frozen page.
const RouteLoading = ({ label }: { label: string }) => {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" aria-live="polite">
      <Loader size={32} label={label} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

export default RouteLoading;
