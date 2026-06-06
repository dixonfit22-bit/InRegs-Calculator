type Tab = "calculator" | "standards" | "dashboard";

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
          {(
            [
              { key: "calculator", label: "Calculator" },
              { key: "standards",  label: "Standards" },
              { key: "dashboard",  label: "Dashboard" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-t border-l border-r transition-colors ${
                activeTab === key
                  ? "border-border bg-background text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
