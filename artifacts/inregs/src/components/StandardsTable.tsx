import { useState, useRef, useEffect } from "react";
import { MALE_MAX_WEIGHT_TABLE, FEMALE_MAX_WEIGHT_TABLE, MALE_BF_STANDARDS, FEMALE_BF_STANDARDS, HEIGHT_RANGE, WHTR_MAX_WAIST, WHTR_STANDARD } from "@/lib/usmcStandards";

const HEIGHTS = Array.from({ length: 27 }, (_, i) => i + 56); // 56–82

// WHtR table rows: all keys in WHTR_MAX_WAIST sorted, converted back to height in inches
const WHTR_ROWS = Object.keys(WHTR_MAX_WAIST)
  .map(Number)
  .sort((a, b) => a - b)
  .map((key) => ({ key, heightIn: key / 2, maxWaist: WHTR_MAX_WAIST[key] }));

export function StandardsTable() {
  const [heightInput, setHeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [whtrHeightInput, setWhtrHeightInput] = useState("");

  const parsedHeight = parseInt(heightInput, 10);
  const parsedAge = parseInt(ageInput, 10);
  const parsedWhtrHeight = parseFloat(whtrHeightInput);

  const highlightedHeight =
    !isNaN(parsedHeight) && parsedHeight >= HEIGHT_RANGE.MIN_INCHES && parsedHeight <= HEIGHT_RANGE.MAX_INCHES
      ? parsedHeight
      : null;

  const highlightedBFIndex = !isNaN(parsedAge) && parsedAge >= 17
    ? MALE_BF_STANDARDS.findIndex((b) => parsedAge <= b.maxAge)
    : null;

  const highlightedWhtrKey = !isNaN(parsedWhtrHeight) && parsedWhtrHeight >= 48 && parsedWhtrHeight <= 87.5
    ? Math.round(parsedWhtrHeight * 2)
    : null;

  // Refs for highlighted rows
  const heightRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bfRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const whtrRowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Scroll highlighted height row into view
  useEffect(() => {
    if (highlightedHeight !== null) {
      heightRowRefs.current[highlightedHeight]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedHeight]);

  // Scroll highlighted BF row into view
  useEffect(() => {
    if (highlightedBFIndex !== null && highlightedBFIndex >= 0) {
      bfRowRefs.current[highlightedBFIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedBFIndex]);

  // Scroll highlighted WHtR row into view
  useEffect(() => {
    if (highlightedWhtrKey !== null) {
      whtrRowRefs.current[highlightedWhtrKey]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedWhtrKey]);

  return (
    <div className="flex flex-col gap-8 pb-8">

      {/* Height / Weight Table */}
      <div>
        <SectionDivider label="Height / Weight Standards" />
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Maximum allowable weight (lbs) by height. Marines exceeding their max weight are subject to body composition evaluation.
        </p>

        {/* Height lookup input */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Jump to height:
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min={56}
              max={82}
              placeholder="e.g. 70"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              className="w-24 border border-border rounded-md px-3 py-1.5 text-sm font-mono bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-height-lookup"
            />
            <span className="ml-2 text-xs text-muted-foreground">in</span>
          </div>
          {highlightedHeight === null && heightInput !== "" && (
            <span className="text-xs text-destructive">56–82 in only</span>
          )}
        </div>

        <div className="border border-border overflow-hidden rounded-md">
          {/* Header row */}
          <div className="grid grid-cols-3 bg-muted border-b border-border">
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
          {HEIGHTS.map((h, i) => {
            const isHighlighted = h === highlightedHeight;
            return (
              <div
                key={h}
                ref={(el) => { heightRowRefs.current[h] = el; }}
                className={`grid grid-cols-3 border-b border-border/50 last:border-b-0 transition-colors duration-300 ${
                  isHighlighted
                    ? "bg-primary text-primary-foreground"
                    : i % 2 === 0
                    ? "bg-card"
                    : "bg-muted/30"
                }`}
                data-testid={`row-height-${h}`}
              >
                <div className={`px-3 py-2.5 text-sm font-mono font-bold text-center flex items-center justify-center gap-1.5 ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                  {h}"
                  {isHighlighted && <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">← your height</span>}
                </div>
                <div className={`px-3 py-2.5 text-sm font-mono font-bold text-center border-l ${isHighlighted ? "border-primary-foreground/20 text-primary-foreground" : "border-border/50 text-primary"}`}>
                  {MALE_MAX_WEIGHT_TABLE[h]}
                </div>
                <div className={`px-3 py-2.5 text-sm font-mono font-bold text-center border-l ${isHighlighted ? "border-primary-foreground/20 text-primary-foreground/80" : "border-border/50 text-primary/70"}`}>
                  {FEMALE_MAX_WEIGHT_TABLE[h]}
                </div>
              </div>
            );
          })}
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

        {/* Age lookup input */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Jump to age:
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min={17}
              max={99}
              placeholder="e.g. 28"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-24 border border-border rounded-md px-3 py-1.5 text-sm font-mono bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-age-lookup"
            />
            <span className="ml-2 text-xs text-muted-foreground">yrs</span>
          </div>
          {!isNaN(parsedAge) && parsedAge < 17 && ageInput !== "" && (
            <span className="text-xs text-destructive">Min age is 17</span>
          )}
        </div>

        <div className="border border-border overflow-hidden rounded-md">
          {/* Header row */}
          <div className="grid grid-cols-3 bg-muted border-b border-border">
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

          {MALE_BF_STANDARDS.map((maleBracket, i) => {
            const femaleBracket = FEMALE_BF_STANDARDS[i];
            const label = maleBracket.maxAge === Infinity
              ? "51+"
              : i === 0
              ? "17–20"
              : `${MALE_BF_STANDARDS[i - 1].maxAge + 1}–${maleBracket.maxAge}`;
            const isHighlighted = i === highlightedBFIndex;

            return (
              <div
                key={i}
                ref={(el) => { bfRowRefs.current[i] = el; }}
                className={`grid grid-cols-3 border-b border-border/50 last:border-b-0 transition-colors duration-300 ${
                  isHighlighted
                    ? "bg-primary text-primary-foreground"
                    : i % 2 === 0
                    ? "bg-card"
                    : "bg-muted/30"
                }`}
                data-testid={`row-bf-age-${i}`}
              >
                <div className={`px-3 py-2.5 text-sm font-mono font-bold text-center flex items-center justify-center gap-1.5 ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                  {label}
                  {isHighlighted && <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">← your age</span>}
                </div>
                <div className={`px-3 py-2.5 text-sm font-mono font-bold text-center border-l ${isHighlighted ? "border-primary-foreground/20 text-primary-foreground" : "border-border/50 text-primary"}`}>
                  {maleBracket.maxBF}%
                </div>
                <div className={`px-3 py-2.5 text-sm font-mono font-bold text-center border-l ${isHighlighted ? "border-primary-foreground/20 text-primary-foreground/80" : "border-border/50 text-primary/70"}`}>
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

      {/* WHtR Screening Table */}
      <div>
        <SectionDivider label="Waist-to-Height Ratio (WHtR) Screening" />
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Standard: WHtR &lt; {WHTR_STANDARD} — If your waist is at or below the max for your height, you pass screening without a full tape measurement.
          Table applies to both male and female Marines. Heights in half-inch increments.
        </p>

        {/* WHtR height lookup */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
            Jump to height:
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min={48}
              max={87.5}
              step={0.5}
              placeholder="e.g. 70"
              value={whtrHeightInput}
              onChange={(e) => setWhtrHeightInput(e.target.value)}
              className="w-24 border border-border rounded-md px-3 py-1.5 text-sm font-mono bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-whtr-height-lookup"
            />
            <span className="ml-2 text-xs text-muted-foreground">in</span>
          </div>
          {!isNaN(parsedWhtrHeight) && (parsedWhtrHeight < 48 || parsedWhtrHeight > 87.5) && whtrHeightInput !== "" && (
            <span className="text-xs text-destructive">48–87.5 in only</span>
          )}
        </div>

        <div className="border border-border overflow-hidden rounded-md max-h-80 overflow-y-auto">
          <div className="grid grid-cols-3 bg-muted border-b border-border sticky top-0 z-10">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
              Height (in)
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary text-center border-l border-border">
              Max Waist (in)
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary/60 text-center border-l border-border">
              Max Ratio
            </div>
          </div>

          {WHTR_ROWS.map(({ key, heightIn, maxWaist }, i) => {
            const isHighlighted = key === highlightedWhtrKey;
            const displayHeight = `${heightIn}"`;
            const maxRatio = (maxWaist / heightIn).toFixed(3);
            return (
              <div
                key={key}
                ref={(el) => { whtrRowRefs.current[key] = el; }}
                className={`grid grid-cols-3 border-b border-border/50 last:border-b-0 transition-colors duration-300 ${
                  isHighlighted
                    ? "bg-primary text-primary-foreground"
                    : i % 2 === 0
                    ? "bg-card"
                    : "bg-muted/30"
                }`}
              >
                <div className={`px-3 py-2 text-sm font-mono font-bold text-center flex items-center justify-center gap-1.5 ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`}>
                  {displayHeight}
                  {isHighlighted && <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">← you</span>}
                </div>
                <div className={`px-3 py-2 text-sm font-mono font-bold text-center border-l ${isHighlighted ? "border-primary-foreground/20 text-primary-foreground" : "border-border/50 text-primary"}`}>
                  {maxWaist}"
                </div>
                <div className={`px-3 py-2 text-sm font-mono text-center border-l ${isHighlighted ? "border-primary-foreground/20 text-primary-foreground/80" : "border-border/50 text-primary/70"}`}>
                  {maxRatio}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Source: fitness.marines.mil — MARADMIN 073/26 (WHtR &lt; {WHTR_STANDARD})
        </p>
      </div>

      {/* Performance Allowances */}
      <div>
        <SectionDivider label="Performance Exemptions & Allowances" />
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Per MCBul 6110, para 4.a.(2)(f). The higher of PFT or CFT score is used.
        </p>

        <div className="border border-border overflow-hidden rounded-md">
          <div className="grid grid-cols-2 bg-muted border-b border-border">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              PFT / CFT Score
            </div>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground border-l border-border">
              Benefit
            </div>
          </div>
          <div className="grid grid-cols-2 border-b border-border/50 bg-card">
            <div className="px-3 py-2.5 text-sm font-mono font-bold text-primary">285</div>
            <div className="px-3 py-2.5 text-sm font-mono text-foreground border-l border-border/50">
              MCBCMAP exempt — pass regardless of body fat
            </div>
          </div>
          <div className="grid grid-cols-2 bg-muted/30">
            <div className="px-3 py-2.5 text-sm font-mono font-bold text-primary/70">250–284</div>
            <div className="px-3 py-2.5 text-sm font-mono text-foreground border-l border-border/50">
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
