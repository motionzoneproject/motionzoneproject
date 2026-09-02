interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
}

/**
 * Ett nyckeltal. Värdet får proportionella siffror med flit — tabular-nums är
 * till för kolumner som ska ligga i linje, och gör stora tal glesa och sladdriga.
 *
 * Storleken är mindre på mobil: två brickor i bredd ger ~140px text, och ett
 * belopp som "269 700 kr" rinner över i 3xl. min-w-0 låter brickan krympa
 * i stället för att pressa ut sitt innehåll ur rutnätet.
 */
export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 wrap-break-word text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
