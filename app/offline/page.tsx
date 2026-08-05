export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">You&apos;re offline</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ClassPilot needs a connection to your homelab server to load or save
          plans. Reconnect and reload to keep working.
        </p>
      </div>
    </main>
  );
}
