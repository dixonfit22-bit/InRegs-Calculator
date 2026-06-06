import { MALE_MAX_WEIGHT_TABLE, FEMALE_MAX_WEIGHT_TABLE, MALE_BF_STANDARDS, FEMALE_BF_STANDARDS } from "@/lib/usmcStandards";

const HEIGHTS = Array.from({ length: 27 }, (_, i) => i + 56); // 56–82

export function StandardsTable() {
  return (
    <div className="flex flex-col gap-8 pb-8">

      {/* Height / Weight Table */}
      <div>
        <SectionDivider label="Height / Weight Standards" />
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Maximum allowable weight (lbs) by height. Marines exceeding their max weight are subject to body composition evaluation.
        </p>

        <div className="border border-border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-3 bg-card border-b border-border">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
              Height (in)
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary text-center border-l border-border">
              Male Max (lbs)
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary/60 text-center border-l border-border">
              Female Max (lbs)
            </div>
          </div>

          {/* Data rows */}
          {HEIGHTS.map((h, i) => (
            <div
              key={h}
              className={`grid grid-cols-3 border-b border-border/50 last:border-b-0 ${
                i % 2 === 0 ? "bg-background" : "bg-card/30"
              }`}
              data-testid={`row-height-${h}`}
            >
              <div className="px-3 py-2 text-sm font-mono text-center text-foreground">
                {h}"
              </div>
              <div className="px-3 py-2 text-sm font-mono font-bold text-center text-primary border-l border-border/50">
                {MALE_MAX_WEIGHT_TABLE[h]}
              </div>
              <div className="px-3 py-2 text-sm font-mono font-bold text-center text-primary/70 border-l border-border/50">
                {FEMALE_MAX_WEIGHT_TABLE[h]}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Source: DoD Height, Weight, and Body Composition Standards — MCBul 6110 (20 Dec 2024)
        </p>
      </div>

      {/* Body Fat Standards Table */}
      <div>
        <SectionDivider label="Body Fat Standards" />
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Maximum allowable body fat percentage by age group. Female standards reflect the +1% increase effective 1 January 2023.
        </p>

        <div className="border border-border overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-3 bg-card border-b border-border">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
              Age Group
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary text-center border-l border-border">
              Male Max BF
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary/60 text-center border-l border-border">
              Female Max BF
            </div>
          </div>

          {/* Age group rows — zip male and female brackets */}
          {MALE_BF_STANDARDS.map((maleBracket, i) => {
            const femaleBracket = FEMALE_BF_STANDARDS[i];
            const label = maleBracket.maxAge === Infinity
              ? "51+"
              : i === 0
              ? "17–20"
              : `${MALE_BF_STANDARDS[i - 1].maxAge + 1}–${maleBracket.maxAge}`;

            return (
              <div
                key={i}
                className={`grid grid-cols-3 border-b border-border/50 last:border-b-0 ${
                  i % 2 === 0 ? "bg-background" : "bg-card/30"
                }`}
                data-testid={`row-bf-age-${i}`}
              >
                <div className="px-3 py-2 text-sm font-mono text-center text-foreground">
                  {label}
                </div>
                <div className="px-3 py-2 text-sm font-mono font-bold text-center text-primary border-l border-border/50">
                  {maleBracket.maxBF}%
                </div>
                <div className="px-3 py-2 text-sm font-mono font-bold text-center text-primary/70 border-l border-border/50">
                  {femaleBracket.maxBF}%
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Source: Marine Corps Body Composition Standards — MCBul 6110 (20 Dec 2024)
        </p>
      </div>

      {/* Performance Allowances */}
      <div>
        <SectionDivider label="Performance Exemptions & Allowances" />
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Per MCBul 6110, para 4.a.(2)(f). The higher of PFT or CFT score is used.
        </p>

        <div className="border border-border overflow-hidden">
          <div className="grid grid-cols-2 bg-card border-b border-border">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              PFT / CFT Score
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground border-l border-border">
              Benefit
            </div>
          </div>
          <div className="grid grid-cols-2 border-b border-border/50 bg-background">
            <div className="px-3 py-2 text-sm font-mono font-bold text-primary">285</div>
            <div className="px-3 py-2 text-sm font-mono text-foreground border-l border-border/50">
              MCBCMAP exempt — pass regardless of body fat
            </div>
          </div>
          <div className="grid grid-cols-2 bg-card/30">
            <div className="px-3 py-2 text-sm font-mono font-bold text-primary/70">250–284</div>
            <div className="px-3 py-2 text-sm font-mono text-foreground border-l border-border/50">
              +1% body fat allowance added to age-group limit
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground uppercase whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
