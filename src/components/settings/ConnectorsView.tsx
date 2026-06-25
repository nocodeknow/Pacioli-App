import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function ConnectorsView() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
      {/* Temporarily Disabled Banner */}
      <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-left max-w-sm mb-2">
        <AlertTriangle className="size-5 text-amber-500 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Temporarily Disabled</span>
          <span className="text-[11px] text-muted-foreground">Google Sheets and other external data connectors are disabled in Phase 1.</span>
        </div>
      </div>

      <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-850 flex items-center justify-center text-muted-foreground mb-2">
        <RefreshCw className="size-8 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Data Connectors</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
        Temporarily Disabled / Refining Core Accounting.
      </p>
    </div>
  );
}
