"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  computeFinancialModel, DEFAULT_ASSUMPTIONS,
  type Assumptions, type FinancialModelOutput,
} from "@/lib/financial-formulas";
import { Save, RefreshCw, Upload } from "lucide-react";
import { parseFileToRows, parseFinancialModelFile } from "@/lib/file-parsers";

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmt = formatCurrency;

function NumInput({
  label, value, onChange, suffix, step = "1", hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
        />
        {suffix && <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function SectionTable({ title, rows }: {
  title: string;
  rows: { label: string; value: string; bold?: boolean; indent?: boolean; className?: string }[];
}) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t ${r.bold ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"} ${r.className || ""}`}>
                <td className={`px-4 py-2 ${r.indent ? "pl-8 text-gray-600" : ""}`}>{r.label}</td>
                <td className="px-4 py-2 text-right font-mono">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function ProjectFinancialTab({ projectId }: { projectId: string; project: unknown }) {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [computed, setComputed] = useState<FinancialModelOutput>(computeFinancialModel(DEFAULT_ASSUMPTIONS));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/api/projects/${projectId}/financial-model`).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setAssumptions(data.assumptions);
        setComputed(data.computed);
      }
      setLoading(false);
    });
  }, [projectId]);

  const updateField = useCallback(<K extends keyof Assumptions>(key: K, value: Assumptions[K]) => {
    setAssumptions((prev) => {
      const next = { ...prev, [key]: value };
      setComputed(computeFinancialModel(next));
      setDirty(true);
      return next;
    });
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const rows = await parseFileToRows(file);
      const partial = parseFinancialModelFile(rows);
      if (Object.keys(partial).length === 0) {
        setUploadError("No recognizable fields found. Check column names match the template.");
        return;
      }
      setAssumptions((prev) => {
        const next = { ...prev, ...partial } as Assumptions;
        setComputed(computeFinancialModel(next));
        setDirty(true);
        return next;
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to parse file.");
    }
    e.target.value = "";
  };

  const save = async () => {
    setSaving(true);
    const res = await api.put(`/api/projects/${projectId}/financial-model`, assumptions);
    if (res.ok) setDirty(false);
    setSaving(false);
  };

  const { costs, revenue, ltvScenarios, capRateScenarios } = computed;

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Financial Model</h2>
          <p className="text-xs text-gray-500">Edit inputs — all values recalculate live</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUpload} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-gray-50 cursor-pointer">
              <Upload className="h-3 w-3" /> Import CSV / XLSX
            </span>
          </label>
          <Button onClick={save} disabled={saving || !dirty} size="sm">
            {saving ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            {saving ? "Saving…" : "Save Inputs"}
          </Button>
        </div>
      </div>
      {uploadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* ─── INPUTS ─── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Project Inputs (Assumptions)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Land & Construction</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumInput label="Land Cost ($)" value={assumptions.landCost} onChange={(v) => updateField("landCost", v)} step="1000" />
              <NumInput label="Construction ($/SFT)" value={assumptions.constructionCostPerSft} onChange={(v) => updateField("constructionCostPerSft", v)} step="1" />
              <NumInput label="Built Area (SFT)" value={assumptions.builtAreaSft} onChange={(v) => updateField("builtAreaSft", v)} step="100" />
              <NumInput label="Leasing Commission ($)" value={assumptions.leasingCommission} onChange={(v) => updateField("leasingCommission", v)} step="1000" />
              <NumInput label="Entitlement Costs ($)" value={assumptions.entitlementCosts} onChange={(v) => updateField("entitlementCosts", v)} step="1000" />
              <NumInput label="Tenant Improvements ($)" value={assumptions.tenantImprovements} onChange={(v) => updateField("tenantImprovements", v)} step="1000" />
              <NumInput label="Interior Build Out ($)" value={assumptions.interiorBuildOut} onChange={(v) => updateField("interiorBuildOut", v)} step="1000" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Construction Financing</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <NumInput label="LTC %" value={assumptions.ltcPct * 100} onChange={(v) => updateField("ltcPct", v / 100)} suffix="%" step="0.5" hint="Loan-to-Cost" />
              <NumInput label="Interest Rate %" value={assumptions.constructionRate * 100} onChange={(v) => updateField("constructionRate", v / 100)} suffix="%" step="0.1" hint="Annual" />
              <NumInput label="Build Period (yrs)" value={assumptions.buildPeriodYears} onChange={(v) => updateField("buildPeriodYears", v)} step="0.5" />
              <NumInput label="Avg Draw Factor %" value={assumptions.avgDrawFactor * 100} onChange={(v) => updateField("avgDrawFactor", v / 100)} suffix="%" step="5" hint="% of loan drawn" />
              <NumInput label="Origination Fee %" value={assumptions.originationFeePct * 100} onChange={(v) => updateField("originationFeePct", v / 100)} suffix="%" step="0.1" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Revenue</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumInput label="Rent Rate ($/SFT/Year)" value={assumptions.rentRatePerSftYear} onChange={(v) => updateField("rentRatePerSftYear", v)} step="0.5" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Permanent Loan</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumInput label="Loan Term (yrs)" value={assumptions.permanentLoanTermYears} onChange={(v) => updateField("permanentLoanTermYears", Math.round(v))} step="1" />
              <NumInput label="Interest Rate %" value={assumptions.permanentLoanRate * 100} onChange={(v) => updateField("permanentLoanRate", v / 100)} suffix="%" step="0.1" />
              <NumInput label="Recommended LTV %" value={assumptions.recommendedLtv * 100} onChange={(v) => updateField("recommendedLtv", v / 100)} suffix="%" step="5" hint="Used in cap rate table" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Exit / Cap Rate Scenarios</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumInput label="Cap Rate 1 %" value={assumptions.capRate1 * 100} onChange={(v) => updateField("capRate1", v / 100)} suffix="%" step="0.25" />
              <NumInput label="Cap Rate 2 %" value={assumptions.capRate2 * 100} onChange={(v) => updateField("capRate2", v / 100)} suffix="%" step="0.25" />
              <NumInput label="Cap Rate 3 %" value={assumptions.capRate3 * 100} onChange={(v) => updateField("capRate3", v / 100)} suffix="%" step="0.25" />
              <NumInput label="Sales Commission %" value={assumptions.salesCommissionPct * 100} onChange={(v) => updateField("salesCommissionPct", v / 100)} suffix="%" step="0.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary callouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Project Cost", value: fmt(costs.totalProjectCost), sub: "All-in development cost" },
          { label: "Annual NOI", value: fmt(revenue.grossAnnualRent), sub: `${assumptions.builtAreaSft.toLocaleString()} SFT × $${assumptions.rentRatePerSftYear}/SFT/yr` },
          { label: "Cap Rate on Cost", value: pct(revenue.goingInCapRateOnCost), sub: "Going-in yield" },
          { label: "Best-Case Asset Value", value: fmt(capRateScenarios[0]?.grossAssetValue ?? 0), sub: capRateScenarios[0]?.label ?? "" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-lg font-bold mt-1">{m.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ─── DEVELOPMENT COST BREAKDOWN ─── */}
        <SectionTable
          title="Development Cost Breakdown"
          rows={[
            { label: "Land Cost", value: fmt(costs.landCost), indent: true },
            { label: "Construction Cost", value: fmt(costs.constructionCostTotal), indent: true },
            { label: "Leasing Commission", value: fmt(costs.leasingCommission), indent: true },
            { label: "Entitlement Costs", value: fmt(costs.entitlementCosts), indent: true },
            { label: "Tenant Improvements", value: fmt(costs.tenantImprovements), indent: true },
            { label: "Interior Build Out", value: fmt(costs.interiorBuildOut), indent: true },
            { label: "Hard Cost Subtotal", value: fmt(costs.hardCostSubtotal), bold: true },
            { label: "Construction Loan (LTC)", value: fmt(costs.loanAmountConstruction), indent: true },
            { label: "Interest During Construction", value: fmt(costs.interestDuringConstruction), indent: true },
            { label: "Origination Fee", value: fmt(costs.originationFee), indent: true },
            { label: "Total Financing Cost", value: fmt(costs.totalFinancingCost), bold: true },
            { label: "TOTAL PROJECT COST", value: fmt(costs.totalProjectCost), bold: true, className: "text-blue-700" },
          ]}
        />

        {/* ─── REVENUE & NOI ─── */}
        <SectionTable
          title="Revenue & NOI"
          rows={[
            { label: "Built / Leasable Area", value: `${assumptions.builtAreaSft.toLocaleString()} SFT` },
            { label: "Rent Rate", value: `$${assumptions.rentRatePerSftYear.toFixed(2)}/SFT/yr` },
            { label: "Gross Annual Rent (NOI)", value: fmt(revenue.grossAnnualRent), bold: true },
            { label: "Monthly Rent", value: fmt(revenue.monthlyRent) },
            { label: "Going-In Cap Rate on Cost", value: pct(revenue.goingInCapRateOnCost), bold: true, className: "text-green-700" },
          ]}
        />
      </div>

      {/* ─── LTV SCENARIO ANALYSIS ─── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">LTV Scenario Analysis — EMI & Cash-on-Cash Returns</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Rate: {pct(assumptions.permanentLoanRate)} · Term: {assumptions.permanentLoanTermYears} years · NOI: {fmt(revenue.grossAnnualRent)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["LTV %", "Loan Amount", "Cash Equity", "Monthly EMI", "Annual EMI", "Annual Cash Flow", "Cash-on-Cash", "DCR", "Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {ltvScenarios.map((s) => {
                  const isRec = Math.abs(s.ltv - assumptions.recommendedLtv) < 0.001;
                  return (
                    <tr key={s.ltv} className={`hover:bg-gray-50 ${isRec ? "bg-blue-50" : ""}`}>
                      <td className="px-3 py-2 font-medium">
                        {pct(s.ltv)}
                        {isRec && <Badge variant="default" className="ml-1 text-xs py-0">Rec.</Badge>}
                      </td>
                      <td className="px-3 py-2 font-mono">{fmt(s.loanAmount)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(s.cashEquity)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(s.monthlyEmi)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(s.annualEmi)}</td>
                      <td className={`px-3 py-2 font-mono font-semibold ${s.annualCashFlow >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {fmt(s.annualCashFlow)}
                      </td>
                      <td className="px-3 py-2 font-mono text-blue-700">{pct(s.cashOnCash)}</td>
                      <td className="px-3 py-2 font-mono">{s.dcr.toFixed(2)}x</td>
                      <td className="px-3 py-2 text-sm">{s.bankable ? "✅ Bankable" : "⚠️ Review"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── CAP RATE VALUATION ─── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Cap Rate Valuation & Net Returns</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            At recommended LTV of {pct(assumptions.recommendedLtv)} · NOI: {fmt(revenue.grossAnnualRent)}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  {capRateScenarios.map((s) => (
                    <th key={s.label} className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{s.label}</th>
                  ))}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {([
                  { label: "Cap Rate", render: (s: typeof capRateScenarios[0]) => pct(s.capRate), note: "Exit cap rate scenario" },
                  { label: "Gross Asset Value", render: (s: typeof capRateScenarios[0]) => fmt(s.grossAssetValue), bold: true, note: "NOI ÷ Cap Rate" },
                  { label: "Sales Commission", render: (s: typeof capRateScenarios[0]) => fmt(s.salesCommission), note: `${pct(assumptions.salesCommissionPct)} of asset value` },
                  { label: "Net Sale Proceeds", render: (s: typeof capRateScenarios[0]) => fmt(s.netSaleProceeds), bold: true, note: "Gross Value − Commission" },
                  { label: `Loan Payoff (${pct(assumptions.recommendedLtv)})`, render: (s: typeof capRateScenarios[0]) => fmt(s.loanPayoff), note: "Permanent loan balance" },
                  { label: "Net Cash to Owner", render: (s: typeof capRateScenarios[0]) => fmt(s.netCashToOwner), bold: true, color: "text-blue-700", note: "Net Proceeds − Loan" },
                  { label: "Total Dev. Cost", render: (_s: typeof capRateScenarios[0]) => fmt(costs.totalProjectCost), note: "All-in project cost" },
                  { label: "Cash Equity Invested", render: (s: typeof capRateScenarios[0]) => fmt(s.cashEquityInvested), note: `${pct(1 - assumptions.recommendedLtv)} equity` },
                  { label: "Development Profit ($)", render: (s: typeof capRateScenarios[0]) => fmt(s.devProfit), bold: true, color: "text-green-700", note: "Net Proceeds − Total Cost" },
                  { label: "Return on Cost", render: (s: typeof capRateScenarios[0]) => pct(s.returnOnCost), note: "Dev Profit ÷ Total Cost" },
                  { label: "Return on Equity", render: (s: typeof capRateScenarios[0]) => pct(s.returnOnEquity), note: "Net Cash ÷ Equity" },
                  { label: "Equity Multiple", render: (s: typeof capRateScenarios[0]) => `${s.equityMultiple.toFixed(2)}x`, bold: true, note: "Total Return ÷ Equity In" },
                ] as Array<{ label: string; render: (s: typeof capRateScenarios[0]) => string; bold?: boolean; color?: string; note?: string }>).map((row) => (
                  <tr key={row.label} className={`hover:bg-gray-50 ${row.bold ? "font-semibold bg-gray-50" : ""}`}>
                    <td className={`px-4 py-2 ${row.color || ""}`}>{row.label}</td>
                    {capRateScenarios.map((s) => (
                      <td key={s.label} className={`px-4 py-2 text-right font-mono ${row.color || ""}`}>
                        {row.render(s)}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-xs text-gray-400">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
