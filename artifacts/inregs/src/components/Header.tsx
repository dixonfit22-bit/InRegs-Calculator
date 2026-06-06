type Tab = "calculator" | "standards";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-xl mx-auto px-4 pt-4 pb-0 flex flex-col gap-1">
        <div className="flex justify-between items-baseline">
          <h1 className="text-2xl font-bold tracking-wider text-primary">IN REGS</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">MCBul 6110 — 20 Dec 2024</p>
        </div>
        <p className="text-sm font-medium text-foreground uppercase tracking-wide mb-3">USMC BCP Calculator</p>

        {/* Tab bar */}
        <div className="flex gap-0 -mb-px">
          <button
            onClick={() => onTabChange("calculator")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-t border-l border-r transition-colors ${
              activeTab === "calculator"
                ? "border-border bg-background text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-calculator"
          >
            Calculator
          </button>
          <button
            onClick={() => onTabChange("standards")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-t border-l border-r transition-colors ${
              activeTab === "standards"
                ? "border-border bg-background text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-standards"
          >
            Standards Table
          </button>
        </div>
      </div>
    </header>
  );
}
