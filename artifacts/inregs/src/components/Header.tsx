type Tab = "calculator" | "standards" | "dashboard";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const tabs = [
    { key: "calculator" as const, label: "Calculator" },
    { key: "standards"  as const, label: "Standards"  },
    { key: "dashboard"  as const, label: "Dashboard"  },
  ];

  return (
    <header style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #112a54 100%)" }}>
      <div className="max-w-xl mx-auto px-4 pt-4 pb-4 flex flex-col gap-3">

        {/* Brand row */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-0">
            <h1
              className="text-2xl font-bold tracking-widest"
              style={{ fontFamily: "'Rajdhani', 'JetBrains Mono', monospace", color: "#ffffff", letterSpacing: "0.1em" }}
            >
              IN REGS
            </h1>
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#7eb3ff", letterSpacing: "0.15em" }}
            >
              USMC BCP Calculator
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "#4a7fc1" }}
            >
              MCBul 6110
            </span>
            <span
              className="text-[9px] font-bold"
              style={{ color: "#4a7fc1" }}
            >
              20 Dec 2024
            </span>
          </div>
        </div>

        {/* Pill tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              data-testid={`tab-${key}`}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-150"
              style={
                activeTab === key
                  ? {
                      background: "#2563eb",
                      color: "#ffffff",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.5)",
                    }
                  : {
                      background: "transparent",
                      color: "rgba(180,210,255,0.7)",
                    }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
