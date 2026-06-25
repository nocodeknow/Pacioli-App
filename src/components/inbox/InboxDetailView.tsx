export default function InboxDetailView() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-primary/10 p-3">
          <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="font-medium text-foreground">Temporarily Disabled</p>
        <p className="text-sm max-w-xs">The staging Inbox and connectors are currently on hold for Phase 1.</p>
      </div>
    </div>
  );
}
