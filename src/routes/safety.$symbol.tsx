import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Upload, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMODITIES } from "@/lib/market-data";
import {
  fetchSafetyData,
  upsertSafetyData,
  uploadSdsFile,
  type MaterialSafetyData,
} from "@/lib/safety-data";
import { toast } from "sonner";

export const Route = createFileRoute("/safety/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol.toUpperCase()} — Safety Data — ChemPulse` },
    ],
  }),
  loader: ({ params }) => {
    const commodity = COMMODITIES.find(
      (c) => c.symbol === params.symbol.toUpperCase(),
    );
    if (!commodity) throw notFound();
    return null;
  },
  component: SafetyDetailPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center text-sm text-muted-foreground">
        Material not found.
      </div>
    </AppShell>
  ),
});

function SafetyDetailPage() {
  const { symbol } = Route.useParams();
  const commodity = COMMODITIES.find((c) => c.symbol === symbol.toUpperCase());
  const [data, setData] = useState<
    Partial<MaterialSafetyData> & { symbol: string }
  >({ symbol: symbol.toUpperCase() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSafetyData(symbol.toUpperCase()).then((d) => {
      if (d) setData(d);
      setLoading(false);
    });
  }, [symbol]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertSafetyData({
        symbol: symbol.toUpperCase(),
        cas_number: data.cas_number ?? null,
        ghs_classification: data.ghs_classification ?? [],
        hazard_statements: data.hazard_statements ?? [],
        precautionary_statements: data.precautionary_statements ?? [],
        signal_word: data.signal_word ?? null,
        pictograms: data.pictograms ?? [],
        storage_requirements: data.storage_requirements ?? null,
        handling_notes: data.handling_notes ?? null,
        reach_registered: data.reach_registered ?? false,
        last_reviewed_at: new Date().toISOString(),
      });
      toast.success("Safety data saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadSdsFile(symbol.toUpperCase(), file);
      setData((d) => ({ ...d, sds_file_url: url }));
      toast.success("SDS uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  if (!commodity) return null;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading safety data…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/safety" className="flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Registry
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {commodity.name}{" "}
            <span className="text-muted-foreground">
              {symbol.toUpperCase()}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit hazard classification and compliance details
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">CAS Number</Label>
            <Input
              value={data.cas_number ?? ""}
              onChange={(e) =>
                setData((d) => ({ ...d, cas_number: e.target.value }))
              }
              placeholder="e.g. 74-85-1"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Signal Word</Label>
            <Select
              value={data.signal_word ?? "none"}
              onValueChange={(v) =>
                setData((d) => ({
                  ...d,
                  signal_word: v === "none" ? null : v,
                }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select signal word" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Danger">Danger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              GHS Classification (comma-separated)
            </Label>
            <Textarea
              value={(data.ghs_classification ?? []).join(", ")}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  ghs_classification: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="Flammable Liquid Cat 2, Skin Irritant Cat 2"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Hazard Statements (H-codes, comma-separated)
            </Label>
            <Textarea
              value={(data.hazard_statements ?? []).join(", ")}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  hazard_statements: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="H225, H315, H319"
              className="mt-1"
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Precautionary Statements (P-codes, comma-separated)
            </Label>
            <Textarea
              value={(data.precautionary_statements ?? []).join(", ")}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  precautionary_statements: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="P210, P233, P280"
              className="mt-1"
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Storage Requirements
            </Label>
            <Textarea
              value={data.storage_requirements ?? ""}
              onChange={(e) =>
                setData((d) => ({ ...d, storage_requirements: e.target.value }))
              }
              placeholder="Store in a cool, well-ventilated area away from ignition sources..."
              className="mt-1"
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Handling Notes</Label>
            <Textarea
              value={data.handling_notes ?? ""}
              onChange={(e) =>
                setData((d) => ({ ...d, handling_notes: e.target.value }))
              }
              placeholder="Use appropriate PPE: nitrile gloves, safety goggles..."
              className="mt-1"
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">SDS Document</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="sds-upload"
              />
              <Button asChild variant="outline" size="sm">
                <label
                  htmlFor="sds-upload"
                  className="cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload SDS PDF
                </label>
              </Button>
              {data.sds_file_url && (
                <a
                  href={data.sds_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View current SDS
                </a>
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-6">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Safety Data"}
        </Button>
      </div>
    </AppShell>
  );
}
