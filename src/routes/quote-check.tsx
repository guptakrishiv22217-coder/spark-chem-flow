import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertCircle, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { COMMODITIES, allQuotes, fmt } from "@/lib/market-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/quote-check")({
  head: () => ({ meta: [{ title: "Quote Checker — ChemPulse" }] }),
  component: QuoteCheckPage,
});

interface QuoteLine {
  id: string;
  symbol: string;
  supplierPrice: number;
  quantity: number;
}

function QuoteCheckPage() {
  const QUOTES_CACHE = useMemo(() => allQuotes(), []);
  const [supplierName, setSupplierName] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([
    { id: crypto.randomUUID(), symbol: "ETH", supplierPrice: 0, quantity: 1 },
  ]);

  const priceOf = (symbol: string) =>
    QUOTES_CACHE.find((q) => q.symbol === symbol)?.price ?? 0;

  const analysis = useMemo(() => {
    return lines.map((line) => {
      const marketPrice = priceOf(line.symbol);
      const diff = line.supplierPrice - marketPrice;
      const diffPct = marketPrice > 0 ? (diff / marketPrice) * 100 : 0;
      const totalSupplierCost = line.supplierPrice * line.quantity;
      const totalMarketCost = marketPrice * line.quantity;
      const totalOverpay = totalSupplierCost - totalMarketCost;
      return {
        ...line,
        marketPrice,
        diff,
        diffPct,
        totalSupplierCost,
        totalMarketCost,
        totalOverpay,
      };
    });
  }, [lines]);

  const totalOverpay = analysis.reduce((s, a) => s + a.totalOverpay, 0);

  const addLine = () => {
    setLines((l) => [
      ...l,
      { id: crypto.randomUUID(), symbol: "ETH", supplierPrice: 0, quantity: 1 },
    ]);
  };

  const updateLine = (id: string, patch: Partial<QuoteLine>) => {
    setLines((l) => l.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: string) => {
    setLines((l) => l.filter((line) => line.id !== id));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClipboardCheck className="h-4 w-4" />
            <span className="font-sans text-xs uppercase tracking-widest">Quote Checker</span>
          </div>
          <h1 className="font-sans text-3xl font-bold tracking-tight">Is This Quote Fair?</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Enter a supplier's quoted prices and quantities to instantly compare against live market rates.
          </p>
        </div>

        <div className="mb-6">
          <Label className="font-sans text-xs text-muted-foreground">Supplier Name (optional)</Label>
          <Input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. Reliance Petrochemicals"
            className="mt-1 max-w-md"
          />
        </div>

        <div className="space-y-4">
          {analysis.map((line) => {
            const isOverpaying = line.diffPct > 2;
            const isGoodDeal = line.diffPct < -2;
            return (
              <div
                key={line.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[12rem]">
                    <Label className="font-sans text-xs text-muted-foreground">Material</Label>
                    <Select
                      value={line.symbol}
                      onValueChange={(v) => updateLine(line.id, { symbol: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMODITIES.map((c) => (
                          <SelectItem key={c.symbol} value={c.symbol}>
                            {c.symbol} — {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-sans text-xs text-muted-foreground">Quoted ₹/kg</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.supplierPrice || ""}
                      onChange={(e) =>
                        updateLine(line.id, { supplierPrice: Number(e.target.value) || 0 })
                      }
                      className="mt-1 w-28 font-mono tabular"
                    />
                  </div>

                  <div>
                    <Label className="font-sans text-xs text-muted-foreground">Quantity (MT)</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={line.quantity || ""}
                      onChange={(e) =>
                        updateLine(line.id, { quantity: Number(e.target.value) || 0 })
                      }
                      className="mt-1 w-24 font-mono tabular"
                    />
                  </div>

                  <button
                    onClick={() => removeLine(line.id)}
                    className="mb-0.5 h-9 px-2 font-mono text-sm text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove line"
                    title="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {line.supplierPrice > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-sm">
                    {isOverpaying ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : isGoodDeal ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-up" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <p className="text-muted-foreground">
                      Market price is ₹{fmt(line.marketPrice)}/kg — this quote is{" "}
                      <span className={`font-semibold ${line.diffPct >= 0 ? "text-down" : "text-up"}`}>
                        {line.diffPct >= 0 ? "+" : ""}
                        {fmt(line.diffPct, 1)}%
                      </span>{" "}
                      {line.diffPct >= 0 ? "above" : "below"} market.
                      {line.quantity > 0 && (
                        <>
                          {" "}That's ₹{fmt(Math.abs(line.totalOverpay), 0)}{" "}
                          {line.totalOverpay >= 0 ? "more" : "less"} than market rate for this quantity.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={addLine}
          className="mt-4 flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-sans text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Material
        </button>

        {analysis.some((a) => a.supplierPrice > 0) && (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-sans text-sm font-semibold">
                Total vs Market{supplierName ? ` — ${supplierName}` : ""}
              </h3>
              <span
                className={`font-mono text-2xl font-bold tabular ${
                  totalOverpay > 0 ? "text-down" : "text-up"
                }`}
              >
                {totalOverpay >= 0 ? "+" : ""}₹{fmt(Math.abs(totalOverpay), 0)}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalOverpay > 0
                ? "You'd be paying above current market rates across this quote."
                : "This quote is at or below current market rates — a good deal."}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
