"use client";

import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { exportTranslationsAction, updateTranslationAction } from "@/app/admin/(dashboard)/content/_actions";
import type { TranslationStringRow } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { EditableCell } from "./EditableCell";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TranslationsTable({ translations, canManage }: { translations: TranslationStringRow[]; canManage: boolean }) {
  const [rows, setRows] = useState(translations);
  const [search, setSearch] = useState("");
  const [context, setContext] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const contexts = useMemo(() => [...new Set(translations.map((r) => r.context).filter(Boolean))] as string[], [translations]);

  const filtered = rows.filter((row) => {
    if (context && row.context !== context) return false;
    if (!search) return true;
    const needle = search.toLowerCase();
    return row.key.toLowerCase().includes(needle) || row.en.toLowerCase().includes(needle) || row.bn.toLowerCase().includes(needle);
  });

  async function handleSave(id: string, field: "en" | "bn", value: string) {
    const result = await updateTranslationAction(id, field, value);
    if (result.success) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value, updatedAt: new Date().toISOString() } : r)));
      toast.success(t("Saved"));
    } else {
      toast.error(result.message ?? t("Failed to save"));
    }
  }

  async function handleExport() {
    setIsExporting(true);
    const result = await exportTranslationsAction();
    setIsExporting(false);
    if (result.success && result.data) {
      downloadJson(result.data, "translations.json");
      toast.success(t("Exported"));
    } else {
      toast.error(result.message ?? t("Export failed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by key or text...")}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <select
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All contexts")}</option>
          {contexts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {t("Export JSON")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Key")}</th>
              <th className="px-4 py-3 font-medium">{t("Context")}</th>
              <th className="px-4 py-3 font-medium">{t("English")}</th>
              <th className="px-4 py-3 font-medium">{t("Bangla")}</th>
              <th className="px-4 py-3 font-medium">{t("Last Updated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono text-xs text-neutral-500">{row.key}</td>
                <td className="px-4 py-2 text-neutral-400">{row.context ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-800">
                  {canManage ? <EditableCell value={row.en} onSave={(v) => handleSave(row.id, "en", v)} /> : row.en}
                </td>
                <td className="px-4 py-2 text-neutral-800">
                  {canManage ? <EditableCell value={row.bn} onSave={(v) => handleSave(row.id, "bn", v)} /> : row.bn}
                </td>
                <td className="px-4 py-2 text-xs text-neutral-400">{new Date(row.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No translations match these filters.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
