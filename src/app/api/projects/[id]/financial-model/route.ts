import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, isPM } from "@/lib/auth";
import { computeFinancialModel, DEFAULT_ASSUMPTIONS, type Assumptions } from "@/lib/financial-formulas";

function toNum(v: unknown): number {
  return typeof v === "object" && v !== null && "toNumber" in v
    ? (v as { toNumber(): number }).toNumber()
    : Number(v ?? 0);
}

function dbToAssumptions(row: Record<string, unknown>): Assumptions {
  return {
    landCost: toNum(row.landCost),
    constructionCostPerSft: toNum(row.constructionCostPerSft),
    builtAreaSft: toNum(row.builtAreaSft),
    leasingCommission: toNum(row.leasingCommission),
    entitlementCosts: toNum(row.entitlementCosts),
    tenantImprovements: toNum(row.tenantImprovements),
    interiorBuildOut: toNum(row.interiorBuildOut),
    ltcPct: toNum(row.ltcPct),
    constructionRate: toNum(row.constructionRate),
    buildPeriodYears: toNum(row.buildPeriodYears),
    avgDrawFactor: toNum(row.avgDrawFactor),
    originationFeePct: toNum(row.originationFeePct),
    rentRatePerSftYear: toNum(row.rentRatePerSftYear),
    permanentLoanTermYears: Number(row.permanentLoanTermYears ?? 25),
    permanentLoanRate: toNum(row.permanentLoanRate),
    capRate1: toNum(row.capRate1),
    capRate2: toNum(row.capRate2),
    capRate3: toNum(row.capRate3),
    salesCommissionPct: toNum(row.salesCommissionPct),
    recommendedLtv: toNum(row.recommendedLtv),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const row = await prisma.projectAssumptions.findUnique({ where: { projectId: id } });
  const assumptions = row ? dbToAssumptions(row as unknown as Record<string, unknown>) : DEFAULT_ASSUMPTIONS;
  const computed = computeFinancialModel(assumptions);

  return NextResponse.json({ assumptions, computed });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!isPM(user, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body: Assumptions = await req.json();

  const row = await prisma.projectAssumptions.upsert({
    where: { projectId: id },
    update: {
      landCost: body.landCost,
      constructionCostPerSft: body.constructionCostPerSft,
      builtAreaSft: body.builtAreaSft,
      leasingCommission: body.leasingCommission,
      entitlementCosts: body.entitlementCosts,
      tenantImprovements: body.tenantImprovements,
      interiorBuildOut: body.interiorBuildOut,
      ltcPct: body.ltcPct,
      constructionRate: body.constructionRate,
      buildPeriodYears: body.buildPeriodYears,
      avgDrawFactor: body.avgDrawFactor,
      originationFeePct: body.originationFeePct,
      rentRatePerSftYear: body.rentRatePerSftYear,
      permanentLoanTermYears: body.permanentLoanTermYears,
      permanentLoanRate: body.permanentLoanRate,
      capRate1: body.capRate1,
      capRate2: body.capRate2,
      capRate3: body.capRate3,
      salesCommissionPct: body.salesCommissionPct,
      recommendedLtv: body.recommendedLtv,
    },
    create: {
      projectId: id,
      landCost: body.landCost,
      constructionCostPerSft: body.constructionCostPerSft,
      builtAreaSft: body.builtAreaSft,
      leasingCommission: body.leasingCommission,
      entitlementCosts: body.entitlementCosts,
      tenantImprovements: body.tenantImprovements,
      interiorBuildOut: body.interiorBuildOut,
      ltcPct: body.ltcPct,
      constructionRate: body.constructionRate,
      buildPeriodYears: body.buildPeriodYears,
      avgDrawFactor: body.avgDrawFactor,
      originationFeePct: body.originationFeePct,
      rentRatePerSftYear: body.rentRatePerSftYear,
      permanentLoanTermYears: body.permanentLoanTermYears,
      permanentLoanRate: body.permanentLoanRate,
      capRate1: body.capRate1,
      capRate2: body.capRate2,
      capRate3: body.capRate3,
      salesCommissionPct: body.salesCommissionPct,
      recommendedLtv: body.recommendedLtv,
    },
  });

  const assumptions = dbToAssumptions(row as unknown as Record<string, unknown>);
  const computed = computeFinancialModel(assumptions);
  return NextResponse.json({ assumptions, computed });
}
