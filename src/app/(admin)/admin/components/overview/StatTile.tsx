interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
}

/**
 * Ett nyckeltal. Värdet får proportionella siffror med flit — tabular-nums är
 * till för kolumner som ska ligga i linje, och gör stora tal glesa och sladdriga.
 */
export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold leading-none text-foreground">
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
