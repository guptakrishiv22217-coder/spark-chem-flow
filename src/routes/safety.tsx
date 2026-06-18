import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, FileText, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { COMMODITIES } from "@/lib/market-data";
import { fetchAllSafetyData, GHS_PICTOGRAMS, type MaterialSafetyData } from "@/lib/safety-data";

export const Route = createFileRoute("/safety")({
  head: () => ({ meta: [{ title: "Safety Data Registry — ChemPulse" }] }),
  component: SafetyPage,
});

function SafetyPage() {
  const [records, setRecords] = useState<MaterialSafetyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllSafetyData()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const recordFor = (symbol: string) => records.find((r) => r.symbol === symbol);
  const filtered = COMMODITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Safety &amp; Compliance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Data Registry</h1>
          <p className="text-sm text-muted-foreground">
            GHS classification, hazard statements, and SDS documents for every material in your portfolio.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading safety data...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const sd = recordFor(c.symbol);
              const hasData = !!sd;
              return (
                <div
                  key={c.symbol}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">{c.symbol}</div>
                      <div className="font-medium">{c.name}</div>
                    </div>
                    {sd?.signal_word && (
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          sd.signal_word === "Danger"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-orange-500/15 text-orange-500"
                        }`}
                      >
                        {sd.signal_word}
                      </span>
                    )}
                  </div>

                  {hasData ? (
                    <div className="space-y-2">
                      {sd.pictograms && sd.pictograms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sd.pictograms.map((p) => (
                            <span key={p} className="text-lg leading-none" title={p}>
                              {GHS_PICTOGRAMS[p] ?? "⚠️"}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {sd.ghs_classification?.join(" · ") || "No classification on file"}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {sd.sds_file_url ? "SDS on file" : "No SDS uploaded"}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No safety data added yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
