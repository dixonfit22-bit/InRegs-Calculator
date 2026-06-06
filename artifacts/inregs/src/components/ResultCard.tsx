export function ResultCard({
  label,
  value,
  unit,
  accent,
  "data-testid": testId,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent: "green" | "yellow" | "red" | "neutral";
  "data-testid"?: string;
}) {
  const getAccentColor = () => {
    switch (accent) {
      case "green":
        return "text-primary";
      case "yellow":
        return "text-yellow-500";
      case "red":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="bg-card border border-border p-4 flex flex-col gap-1">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-3xl font-bold tracking-tight ${getAccentColor()}`} data-testid={testId}>
        {value}
        {unit && <span className="text-lg ml-1 font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
