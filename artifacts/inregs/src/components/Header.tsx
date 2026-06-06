export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-wider text-primary">IN REGS</h1>
        <div className="flex justify-between items-baseline">
          <p className="text-sm font-medium text-foreground uppercase tracking-wide">USMC BCP Calculator</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">MCO 6100.13A W/CH 3 — Jul 2023</p>
        </div>
      </div>
    </header>
  );
}
