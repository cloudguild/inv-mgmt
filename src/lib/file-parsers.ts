import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Assumptions } from "./financial-formulas";

// ─── Generic file → 2-D array ─────────────────────────────────────────────────

export async function parseFileToRows(file: File): Promise<string[][]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCsv(file);
  if (ext === "xlsx" || ext === "xls") return parseXlsx(file);
  throw new Error("Unsupported file type. Use .csv or .xlsx");
}

function parseCsv(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      complete: (r) => resolve(r.data as string[][]),
      error: reject,
      skipEmptyLines: true,
    });
  });
}

function parseXlsx(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
        resolve(rows.filter((r) => r.some((c) => String(c).trim() !== "")));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Financial Model ──────────────────────────────────────────────────────────
// Expected CSV/XLSX: two-column key-value table.
// Column A = label (case-insensitive, spaces ignored), Column B = numeric value.
// Percentages can be supplied as 0.65 or 65 (anything > 1 is divided by 100).

const FINANCIAL_KEY_MAP: Record<string, keyof Assumptions> = {
  landcost: "landCost",
  constructioncostpersft: "constructionCostPerSft",
  constructioncost: "constructionCostPerSft",
  builtareasft: "builtAreaSft",
  builtarea: "builtAreaSft",
  leasingcommission: "leasingCommission",
  entitlementcosts: "entitlementCosts",
  entitlement: "entitlementCosts",
  tenantimprovements: "tenantImprovements",
  interiorbuildout: "interiorBuildOut",
  ltcpct: "ltcPct",
  ltc: "ltcPct",
  constructionrate: "constructionRate",
  interestrate: "constructionRate",
  buildperiodyears: "buildPeriodYears",
  buildperiod: "buildPeriodYears",
  avgdrawfactor: "avgDrawFactor",
  drawfactor: "avgDrawFactor",
  originationfeepct: "originationFeePct",
  originationfee: "originationFeePct",
  rentratepersft: "rentRatePerSftYear",
  rentrate: "rentRatePerSftYear",
  permanentloanterm: "permanentLoanTermYears",
  loanterm: "permanentLoanTermYears",
  permanentloanrate: "permanentLoanRate",
  caprate1: "capRate1",
  caprate2: "capRate2",
  caprate3: "capRate3",
  salescommissionpct: "salesCommissionPct",
  salescommission: "salesCommissionPct",
  recommendedltv: "recommendedLtv",
};

const PCT_FIELDS = new Set<keyof Assumptions>([
  "ltcPct", "constructionRate", "avgDrawFactor", "originationFeePct",
  "permanentLoanRate", "capRate1", "capRate2", "capRate3",
  "salesCommissionPct", "recommendedLtv",
]);

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseFinancialModelFile(rows: string[][]): Partial<Assumptions> {
  const result: Partial<Assumptions> = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const rawKey = String(row[0]).trim();
    const rawVal = String(row[1]).trim();
    if (!rawKey || !rawVal) continue;
    const normalized = normalizeKey(rawKey);
    const field = FINANCIAL_KEY_MAP[normalized];
    if (!field) continue;
    let num = parseFloat(rawVal.replace(/[,$%]/g, ""));
    if (isNaN(num)) continue;
    // if it's a pct field and value > 1, divide by 100
    if (PCT_FIELDS.has(field) && num > 1) num = num / 100;
    (result as Record<string, number>)[field] = num;
  }
  return result;
}

// ─── Project Plan ─────────────────────────────────────────────────────────────
// Expected format (header row required):
// Phase Name | Start Date | End Date | Task Name | Due Date | Status
// Phases are grouped by name. Rows with no Task Name = phase-only row.

export interface ParsedPhase {
  name: string;
  startDate: string;
  endDate: string;
  tasks: { name: string; dueDate: string; status: string }[];
}

function toIso(val: string): string {
  if (!val) return "";
  // Excel serial date number
  const n = parseFloat(val);
  if (!isNaN(n) && n > 40000) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  // try parsing as date string
  const dt = new Date(val);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return "";
}

export function parsePlanFile(rows: string[][]): ParsedPhase[] {
  if (rows.length < 2) throw new Error("File must have a header row and at least one data row.");
  const header = rows[0].map((h) => normalizeKey(String(h)));

  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const phaseNameIdx = idx(["phasename", "phase"]);
  const startIdx = idx(["startdate", "start"]);
  const endIdx = idx(["enddate", "end"]);
  const taskIdx = idx(["taskname", "task"]);
  const dueDateIdx = idx(["duedate", "due"]);
  const statusIdx = idx(["status"]);

  if (phaseNameIdx === -1) throw new Error("Missing 'Phase Name' column.");

  const phaseMap = new Map<string, ParsedPhase>();
  const phaseOrder: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const phaseName = String(row[phaseNameIdx] ?? "").trim();
    if (!phaseName) continue;

    if (!phaseMap.has(phaseName)) {
      phaseMap.set(phaseName, {
        name: phaseName,
        startDate: startIdx !== -1 ? toIso(String(row[startIdx] ?? "")) : "",
        endDate: endIdx !== -1 ? toIso(String(row[endIdx] ?? "")) : "",
        tasks: [],
      });
      phaseOrder.push(phaseName);
    }

    const taskName = taskIdx !== -1 ? String(row[taskIdx] ?? "").trim() : "";
    if (taskName) {
      const phase = phaseMap.get(phaseName)!;
      phase.tasks.push({
        name: taskName,
        dueDate: dueDateIdx !== -1 ? toIso(String(row[dueDateIdx] ?? "")) : "",
        status: statusIdx !== -1 ? (String(row[statusIdx] ?? "").toLowerCase().replace(/ /g, "_") || "not_started") : "not_started",
      });
    }
  }

  return phaseOrder.map((n) => phaseMap.get(n)!);
}
