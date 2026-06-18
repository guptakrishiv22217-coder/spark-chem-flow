import { supabase } from "@/integrations/supabase/client";

export interface MaterialSafetyData {
  id: string;
  symbol: string;
  cas_number: string | null;
  ghs_classification: string[] | null;
  hazard_statements: string[] | null;
  precautionary_statements: string[] | null;
  signal_word: string | null;
  pictograms: string[] | null;
  storage_requirements: string | null;
  handling_notes: string | null;
  sds_file_url: string | null;
  reach_registered: boolean | null;
  last_reviewed_at: string | null;
}

export async function fetchAllSafetyData(): Promise<MaterialSafetyData[]> {
  const { data, error } = await supabase
    .from("material_safety_data")
    .select("*")
    .order("symbol");
  if (error) throw error;
  return data ?? [];
}

export async function fetchRefinedSdsFile(symbol: string, file: File): Promise<string> {
  const path = `${symbol}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("sds-documents").upload(path, file, {
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("sds-documents").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchSafetyData(symbol: string): Promise<MaterialSafetyData | null> {
  const { data, error } = await supabase
    .from("material_safety_data")
    .select("*")
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSafetyData(record: Partial<MaterialSafetyData> & { symbol: string }) {
  const { error } = await supabase
    .from("material_safety_data")
    .upsert({ ...record, updated_at: new Date().toISOString() }, { onConflict: "symbol" });
  if (error) throw error;
}

export async function uploadSdsFile(symbol: string, file: File): Promise<string> {
  const path = `${symbol}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("sds-documents").upload(path, file, {
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("sds-documents").getPublicUrl(path);
  return data.publicUrl;
}

export const GHS_PICTOGRAMS: Record<string, string> = {
  flame: "🔥",
  "flame-over-circle": "🔥",
  corrosion: "🧪",
  "exploding-bomb": "💥",
  "gas-cylinder": "🛢️",
  skull: "☠️",
  "health-hazard": "⚠️",
  "exclamation-mark": "❗",
  "environment": "🌍",
};
