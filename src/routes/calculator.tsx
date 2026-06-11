import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Beaker, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCommodities, fmt, inr } from "@/lib/commodities";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Margin Calculator — ChemPulse" },
      {
        name: "description",
        content:
          "Reactive Blue Dye margin calculator with live raw material prices and what-if price-spike sliders.",
      },
    ],
  }),
  component: CalculatorPage,
});

// Layer 3 — Reactive Blue Dye recipe (kg of raw material per kg of finished dye)
const RECIPE = [
  { symbol: "HACID", label: "H-Acid", qty: 0.35 },
  { symbol: "ANILINE", label: "Aniline", qty: 0.18 },
  { symbol: "CAUSTIC", label: "Caustic Soda (Flakes)", qty: 0.22 },
] as const;

function CalculatorPage() {
  const { data: quotes = [], isLoading, error } = useCommodities();

  const [sellPrice, setSellPrice] = useState(380); // ₹/kg finished
  const [targetMargin, setTargetMargin] = useState(25); // %
  // What-if % adjustment per raw material (-50% .. +100%)
  const [shocks, setShocks] = useState<Record<string, number>>({
    HACID: 0,
    ANILINE: 0,
    CAUSTIC: 0,
  });

  const lines = useMemo(
    () =>
      RECIPE.map((r) => {
        const q = quotes.find((x) => x.symbol === r.symbol);
        const basePrice = q?.price ?? 0;
        const shockPct = shocks[r.symbol] ?? 0;
        const shockedPrice = basePrice * (1 + shockPct / 100);
        const cost = shockedPrice * r.qty;
        return { ...r, basePrice, shockPct, shockedPrice, cost, found: !!q };
      }),
    [quotes, shocks],
  );

  const rawCost = lines.reduce((s, l) => s + l.cost, 0);
  const margin = sellPrice - rawCost;
  const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;
  const targetCost = sellPrice * (1 - targetMargin / 100);
  const headroom = targetCost - rawCost; // positive = healthy

  // Health gauge: marginPct vs targetMargin
  const health =
    marginPct >= targetMargin
      ? "Healthy"
      : marginPct >= targetMargin * 0.6
        ? "At Risk"
        : marginPct >= 0
          ? "Critical"
          : "Loss";
  const healthTone =
    health === "Healthy"
      ? "text-up"
      : health === "At Risk"
        ? "text-primary"
        : "text-down";
  const gaugePct = Math.max(0, Math.min(100, (marginPct / Math.max(targetMargin, 1)) * 100));

  return (
    <AppShell>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Layer 3 · Margin Calculator
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
          <Beaker className="h-6 w-6 text-primary" /> Reactive Blue Dye
        </h1>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          Live raw material prices from commodities table · what-if sliders simulate price spikes
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-down/40 bg-down/10 p-3 font-mono text-xs text-down">
          Failed to load prices: {(error as Error).message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recipe + sliders */}
        <section className="rounded-md border border-border bg-card p-4 lg:col-span-2">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Finished Price (₹/kg)
              </Label>
              <Input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value) || 0)}
                className="mt-1 font-mono tabular"
              />
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Target Margin (%)
              </Label>
              <Input
                type="number"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value) || 0)}
                className="mt-1 font-mono tabular"
              />
            </div>
          </div>

          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Recipe · Raw Materials (kg per kg of finished dye)
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 font-mono text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading live prices…
            </div>
          ) : (
            <div className="space-y-4">
              {lines.map((l) => (
                <div key={l.symbol} className="rounded-md border border-border bg-background p-3">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {l.label}{" "}
                        <span className="text-muted-foreground">({l.symbol})</span>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {fmt(l.qty, 2)} kg/kg · live {inr(l.basePrice)}/kg
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular">
                        {inr(l.shockedPrice)}{" "}
                        <span className="text-muted-foreground">/kg</span>
                      </div>
                      <div className="font-mono text-[11px] tabular text-primary">
                        cost {inr(l.cost)}
                      </div>
                    </div>
                  </div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      What-if price shock
                    </Label>
                    <span
                      className={`font-mono text-xs tabular ${
                        l.shockPct > 0
                          ? "text-down"
                          : l.shockPct < 0
                            ? "text-up"
                            : "text-muted-foreground"
                      }`}
                    >
                      {l.shockPct > 0 ? "+" : ""}
                      {l.shockPct}%
                    </span>
                  </div>
                  <Slider
                    value={[l.shockPct]}
                    min={-50}
                    max={100}
                    step={1}
                    onValueChange={(v) =>
                      setShocks((s) => ({ ...s, [l.symbol]: v[0] }))
                    }
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>-50%</span>
                    <span>baseline</span>
                    <span>+100%</span>
                  </div>
                </div>
              ))}

              {lines.some((l) => !l.found) && (
                <p className="font-mono text-[11px] text-down">
                  Some recipe symbols are missing from the commodities table.
                </p>
              )}

              <button
                onClick={() => setShocks({ HACID: 0, ANILINE: 0, CAUSTIC: 0 })}
                className="font-mono text-[11px] text-muted-foreground underline hover:text-foreground"
              >
                Reset all shocks
              </button>
            </div>
          )}
        </section>

        {/* Health gauge */}
        <section className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Margin Health
            </h2>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`font-mono text-3xl font-semibold tabular ${healthTone}`}>
                {fmt(marginPct, 1)}%
              </span>
              <span className={`font-mono text-xs uppercase tracking-widest ${healthTone}`}>
                {health}
              </span>
            </div>
            <Gauge value={gaugePct} />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>target {targetMargin}%</span>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-3 font-mono text-xs">
              <Row label="Raw cost / kg" value={inr(rawCost)} />
              <Row label="Sell price / kg" value={inr(sellPrice)} />
              <Row
                label="Margin / kg"
                value={inr(margin)}
                tone={margin >= 0 ? "up" : "down"}
                bold
              />
              <Row
                label={`Headroom vs ${targetMargin}% target`}
                value={`${headroom >= 0 ? "+" : ""}${inr(headroom)}`}
                tone={headroom >= 0 ? "up" : "down"}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cost Breakdown
            </h2>
            {lines.map((l) => {
              const share = rawCost > 0 ? (l.cost / rawCost) * 100 : 0;
              return (
                <div key={l.symbol} className="mb-2.5">
                  <div className="flex items-baseline justify-between font-mono text-xs">
                    <span>{l.label}</span>
                    <span className="tabular">
                      {inr(l.cost)}{" "}
                      <span className="text-muted-foreground">({fmt(share, 0)}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "up" | "down";
}) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular ${bold ? "font-semibold" : ""} ${color}`}>{value}</span>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 100 ? "bg-up" : v >= 60 ? "bg-primary" : v >= 1 ? "bg-down/70" : "bg-down";
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full transition-all ${tone}`}
        style={{ width: `${Math.min(v, 100)}%` }}
      />
      <div className="absolute inset-y-0 left-[100%] w-px bg-foreground/60" />
    </div>
  );
}
