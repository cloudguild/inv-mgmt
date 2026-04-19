export interface Assumptions {
  landCost: number;
  constructionCostPerSft: number;
  builtAreaSft: number;
  leasingCommission: number;
  entitlementCosts: number;
  tenantImprovements: number;
  interiorBuildOut: number;
  ltcPct: number;
  constructionRate: number;
  buildPeriodYears: number;
  avgDrawFactor: number;
  originationFeePct: number;
  rentRatePerSftYear: number;
  permanentLoanTermYears: number;
  permanentLoanRate: number;
  capRate1: number;
  capRate2: number;
  capRate3: number;
  salesCommissionPct: number;
  recommendedLtv: number;
}

export interface CostBreakdown {
  landCost: number;
  constructionCostTotal: number;
  leasingCommission: number;
  entitlementCosts: number;
  tenantImprovements: number;
  interiorBuildOut: number;
  hardCostSubtotal: number;
  loanAmountConstruction: number;
  interestDuringConstruction: number;
  originationFee: number;
  totalFinancingCost: number;
  totalProjectCost: number;
}

export interface RevenueMetrics {
  grossAnnualRent: number;
  monthlyRent: number;
  goingInCapRateOnCost: number;
}

export interface LtvScenario {
  ltv: number;
  loanAmount: number;
  cashEquity: number;
  monthlyEmi: number;
  annualEmi: number;
  annualCashFlow: number;
  cashOnCash: number;
  dcr: number;
  bankable: boolean;
}

export interface CapRateScenario {
  capRate: number;
  label: string;
  grossAssetValue: number;
  salesCommission: number;
  netSaleProceeds: number;
  loanPayoff: number;
  netCashToOwner: number;
  cashEquityInvested: number;
  devProfit: number;
  returnOnCost: number;
  returnOnEquity: number;
  equityMultiple: number;
}

export interface FinancialModelOutput {
  costs: CostBreakdown;
  revenue: RevenueMetrics;
  ltvScenarios: LtvScenario[];
  capRateScenarios: CapRateScenario[];
}

// Standard mortgage payment formula
function pmt(annualRate: number, termYears: number, principal: number): number {
  const monthlyRate = annualRate / 12;
  const nper = termYears * 12;
  if (monthlyRate === 0) return principal / nper;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -nper));
}

export function computeFinancialModel(a: Assumptions): FinancialModelOutput {
  // --- Cost Breakdown ---
  const constructionCostTotal = a.constructionCostPerSft * a.builtAreaSft;
  const hardCostSubtotal =
    a.landCost + constructionCostTotal + a.leasingCommission +
    a.entitlementCosts + a.tenantImprovements + a.interiorBuildOut;
  const loanAmountConstruction = hardCostSubtotal * a.ltcPct;
  const interestDuringConstruction =
    loanAmountConstruction * a.constructionRate * a.buildPeriodYears * a.avgDrawFactor;
  const originationFee = loanAmountConstruction * a.originationFeePct;
  const totalFinancingCost = interestDuringConstruction + originationFee;
  const totalProjectCost = hardCostSubtotal + totalFinancingCost;

  const costs: CostBreakdown = {
    landCost: a.landCost,
    constructionCostTotal,
    leasingCommission: a.leasingCommission,
    entitlementCosts: a.entitlementCosts,
    tenantImprovements: a.tenantImprovements,
    interiorBuildOut: a.interiorBuildOut,
    hardCostSubtotal,
    loanAmountConstruction,
    interestDuringConstruction,
    originationFee,
    totalFinancingCost,
    totalProjectCost,
  };

  // --- Revenue ---
  const grossAnnualRent = a.builtAreaSft * a.rentRatePerSftYear;
  const monthlyRent = grossAnnualRent / 12;
  const goingInCapRateOnCost = totalProjectCost > 0 ? grossAnnualRent / totalProjectCost : 0;

  const revenue: RevenueMetrics = { grossAnnualRent, monthlyRent, goingInCapRateOnCost };

  // --- LTV Scenarios ---
  const ltvValues = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75];
  const ltvScenarios: LtvScenario[] = ltvValues.map((ltv) => {
    const loanAmount = totalProjectCost * ltv;
    const cashEquity = totalProjectCost - loanAmount;
    const monthlyEmi = pmt(a.permanentLoanRate, a.permanentLoanTermYears, loanAmount);
    const annualEmi = monthlyEmi * 12;
    const annualCashFlow = grossAnnualRent - annualEmi;
    const cashOnCash = cashEquity > 0 ? annualCashFlow / cashEquity : 0;
    const dcr = annualEmi > 0 ? grossAnnualRent / annualEmi : 0;
    return { ltv, loanAmount, cashEquity, monthlyEmi, annualEmi, annualCashFlow, cashOnCash, dcr, bankable: dcr >= 1.25 };
  });

  // --- Cap Rate Scenarios ---
  const capRates = [
    { rate: a.capRate1, label: `${(a.capRate1 * 100).toFixed(2)}% Cap` },
    { rate: a.capRate2, label: `${(a.capRate2 * 100).toFixed(2)}% Cap` },
    { rate: a.capRate3, label: `${(a.capRate3 * 100).toFixed(2)}% Cap` },
  ];
  const cashEquityInvested = totalProjectCost * (1 - a.recommendedLtv);
  const loanPayoff = totalProjectCost * a.recommendedLtv;

  const capRateScenarios: CapRateScenario[] = capRates.map(({ rate, label }) => {
    const grossAssetValue = rate > 0 ? grossAnnualRent / rate : 0;
    const salesCommission = grossAssetValue * a.salesCommissionPct;
    const netSaleProceeds = grossAssetValue - salesCommission;
    const netCashToOwner = netSaleProceeds - loanPayoff;
    const devProfit = netSaleProceeds - totalProjectCost;
    const returnOnCost = totalProjectCost > 0 ? devProfit / totalProjectCost : 0;
    const returnOnEquity = cashEquityInvested > 0 ? netCashToOwner / cashEquityInvested : 0;
    const equityMultiple = cashEquityInvested > 0 ? (netCashToOwner + cashEquityInvested) / cashEquityInvested : 0;
    return { capRate: rate, label, grossAssetValue, salesCommission, netSaleProceeds, loanPayoff, netCashToOwner, cashEquityInvested, devProfit, returnOnCost, returnOnEquity, equityMultiple };
  });

  return { costs, revenue, ltvScenarios, capRateScenarios };
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  landCost: 0,
  constructionCostPerSft: 0,
  builtAreaSft: 0,
  leasingCommission: 0,
  entitlementCosts: 0,
  tenantImprovements: 0,
  interiorBuildOut: 0,
  ltcPct: 0.75,
  constructionRate: 0.075,
  buildPeriodYears: 1.5,
  avgDrawFactor: 0.55,
  originationFeePct: 0.01,
  rentRatePerSftYear: 0,
  permanentLoanTermYears: 25,
  permanentLoanRate: 0.075,
  capRate1: 0.055,
  capRate2: 0.060,
  capRate3: 0.0625,
  salesCommissionPct: 0.06,
  recommendedLtv: 0.65,
};
