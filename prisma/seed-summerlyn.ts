import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL ?? "";
let connectionString = rawUrl;
try { const u = new URL(rawUrl); u.searchParams.delete("sslmode"); connectionString = u.toString(); } catch { /* ignore */ }

const pool = new Pool({ connectionString, ssl: rawUrl.length > 0 ? { rejectUnauthorized: false } : false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PHASES = [
  { name: "Phase 1 — Land Acquisition", tasks: [
    { name: "Identify & Select Target Parcel", status: "not_started" as const },
    { name: "Engage Real Estate Attorney", status: "not_started" as const },
    { name: "Execute Letter of Intent (LOI)", status: "not_started" as const },
    { name: "Open Escrow & Deposit Earnest Money", status: "not_started" as const },
    { name: "Title Search & Commitment", status: "not_started" as const },
    { name: "ALTA/NSPS Land Survey", status: "not_started" as const },
    { name: "Phase I Environmental Site Assessment", status: "not_started" as const },
    { name: "Geotechnical / Soils Investigation", status: "not_started" as const },
    { name: "ETJ / Zoning & Land Use Confirmation", status: "not_started" as const },
    { name: "Utility Availability Study", status: "not_started" as const },
    { name: "Execute Purchase & Sale Agreement", status: "not_started" as const },
    { name: "Due Diligence Review & Go/No-Go", status: "not_started" as const },
  ]},
  { name: "Phase 2 — Land Closing", tasks: [
    { name: "Form Legal Entity (LLC/LP)", status: "not_started" as const },
    { name: "Open Entity Bank Account", status: "not_started" as const },
    { name: "Finalize Title Insurance Commitment", status: "not_started" as const },
    { name: "Closing Disclosure & Wire Instructions", status: "not_started" as const },
    { name: "Land Closing", status: "not_started" as const },
    { name: "Deed & Title Policy Delivery", status: "not_started" as const },
    { name: "Post-Closing Entity & Tax Setup", status: "not_started" as const },
  ]},
  { name: "Phase 3 — Funding & Financing", tasks: [
    { name: "Develop Pro Forma & Financial Model", status: "not_started" as const },
    { name: "Prepare Investor Deck & PPM", status: "not_started" as const },
    { name: "Equity Capital Raise", status: "not_started" as const },
    { name: "Investor Agreements & Closing Docs", status: "not_started" as const },
    { name: "Select Construction Lender", status: "not_started" as const },
    { name: "Construction Loan Application Package", status: "not_started" as const },
    { name: "Bank Underwriting & Appraisal", status: "not_started" as const },
    { name: "Loan Commitment Letter", status: "not_started" as const },
    { name: "Construction Loan Closing", status: "not_started" as const },
  ]},
  { name: "Phase 4 — Civil & Engineering Plans", tasks: [
    { name: "Issue RFP & Select Civil Engineer", status: "not_started" as const },
    { name: "Civil Engineering Agreement", status: "not_started" as const },
    { name: "Topographic Survey", status: "not_started" as const },
    { name: "Utility Coordination", status: "not_started" as const },
    { name: "Flood Plain Analysis & FEMA Review", status: "not_started" as const },
    { name: "Site Plan Design (Civil)", status: "not_started" as const },
    { name: "Drainage & Detention Design", status: "not_started" as const },
    { name: "Water Quality / SWPPP", status: "not_started" as const },
    { name: "Utility Plans (Civil)", status: "not_started" as const },
    { name: "100% Civil Plan Set", status: "not_started" as const },
  ]},
  { name: "Phase 5 — Architecture & Building Plans", tasks: [
    { name: "Issue RFP & Select Architect", status: "not_started" as const },
    { name: "Architecture Agreement", status: "not_started" as const },
    { name: "Programming & Space Planning", status: "not_started" as const },
    { name: "Schematic Design (SD)", status: "not_started" as const },
    { name: "Design Development (DD)", status: "not_started" as const },
    { name: "Construction Documents (CDs)", status: "not_started" as const },
    { name: "ADA / TAS Compliance Review", status: "not_started" as const },
    { name: "Fire Marshal Pre-Application Meeting", status: "not_started" as const },
    { name: "Energy Code Compliance (IECC)", status: "not_started" as const },
    { name: "100% CD Plan Set & Specifications", status: "not_started" as const },
  ]},
  { name: "Phase 6 — County & City Submittals", tasks: [
    { name: "Pre-Submittal Meeting – Williamson County", status: "not_started" as const },
    { name: "ETJ Permit Application Submittal", status: "not_started" as const },
    { name: "Liberty Hill Coordination", status: "not_started" as const },
    { name: "County Plan Review – Round 1", status: "not_started" as const },
    { name: "Response to County Comments – Round 1", status: "not_started" as const },
    { name: "County Plan Review – Round 2", status: "not_started" as const },
    { name: "Response to County Comments – Round 2", status: "not_started" as const },
    { name: "Final Plan Approval", status: "not_started" as const },
  ]},
  { name: "Phase 7 — Permits & Approvals", tasks: [
    { name: "Grading / Site Development Permit", status: "not_started" as const },
    { name: "TCEQ NOI – Construction General Permit", status: "not_started" as const },
    { name: "Building Permit Issuance", status: "not_started" as const },
    { name: "Utility Permits", status: "not_started" as const },
    { name: "HHSC Daycare License Pre-Application", status: "not_started" as const },
    { name: "TDLR Accessibility Registration", status: "not_started" as const },
    { name: "Fire Marshal Permit", status: "not_started" as const },
  ]},
  { name: "Phase 8 — Contractor Procurement", tasks: [
    { name: "Develop Bid Package", status: "not_started" as const },
    { name: "Advertise & Solicit Bids", status: "not_started" as const },
    { name: "Receive & Evaluate Bids", status: "not_started" as const },
    { name: "Contractor Interviews & Negotiations", status: "not_started" as const },
    { name: "GC Contract Execution", status: "not_started" as const },
    { name: "Performance & Payment Bonds", status: "not_started" as const },
    { name: "Subcontractor Awards", status: "not_started" as const },
    { name: "Pre-Construction Meeting", status: "not_started" as const },
  ]},
  { name: "Phase 9 — Horizontal Construction", tasks: [
    { name: "Mobilization & Temporary Facilities", status: "not_started" as const },
    { name: "Site Clearing & Demolition", status: "not_started" as const },
    { name: "Rough Grading", status: "not_started" as const },
    { name: "Underground Utilities – Wet", status: "not_started" as const },
    { name: "Underground Utilities – Dry", status: "not_started" as const },
    { name: "Detention / Water Quality Construction", status: "not_started" as const },
    { name: "Subgrade Preparation & Base Course", status: "not_started" as const },
    { name: "Paving & Concrete Flatwork", status: "not_started" as const },
    { name: "Utility Connections & Meters", status: "not_started" as const },
    { name: "Horizontal Inspection & Sign-Off", status: "not_started" as const },
  ]},
  { name: "Phase 10 — Vertical Construction", tasks: [
    { name: "Building Layout & Foundation Prep", status: "not_started" as const },
    { name: "Foundation – Slab on Grade or Pier & Beam", status: "not_started" as const },
    { name: "Structural Steel / Framing", status: "not_started" as const },
    { name: "Roofing System", status: "not_started" as const },
    { name: "MEP Rough-Ins (Mechanical)", status: "not_started" as const },
    { name: "MEP Rough-Ins (Electrical)", status: "not_started" as const },
    { name: "MEP Rough-Ins (Plumbing)", status: "not_started" as const },
    { name: "Fire Sprinkler Rough-In", status: "not_started" as const },
    { name: "Exterior Envelope – Sheathing & Weather Barrier", status: "not_started" as const },
    { name: "Exterior Cladding & Windows/Doors", status: "not_started" as const },
    { name: "MEP Inspections – Rough-In", status: "not_started" as const },
    { name: "Insulation", status: "not_started" as const },
    { name: "Drywall & Exterior Sheathing Inspection", status: "not_started" as const },
  ]},
  { name: "Phase 11 — Interior Buildout Permits", tasks: [
    { name: "Interior Permit Package Preparation", status: "not_started" as const },
    { name: "Health Department Pre-Inspection", status: "not_started" as const },
    { name: "HHSC Facility Pre-Inspection", status: "not_started" as const },
    { name: "Fire Marshal Walkthrough – Interior", status: "not_started" as const },
  ]},
  { name: "Phase 12 — Interior Buildout", tasks: [
    { name: "Drywall & Interior Framing", status: "not_started" as const },
    { name: "Interior Doors & Hardware", status: "not_started" as const },
    { name: "Flooring", status: "not_started" as const },
    { name: "Ceilings – Grid & Tile", status: "not_started" as const },
    { name: "MEP Trim-Out (Mechanical)", status: "not_started" as const },
    { name: "MEP Trim-Out (Electrical)", status: "not_started" as const },
    { name: "MEP Trim-Out (Plumbing)", status: "not_started" as const },
    { name: "Fire Alarm & Security Systems", status: "not_started" as const },
    { name: "Painting & Wall Finishes", status: "not_started" as const },
    { name: "Casework, Millwork & Cabinetry", status: "not_started" as const },
    { name: "FF&E Installation", status: "not_started" as const },
    { name: "Landscaping & Site Finishes", status: "not_started" as const },
    { name: "Final Cleaning", status: "not_started" as const },
  ]},
  { name: "Phase 13 — Bank Draw Management", tasks: [
    { name: "Establish Draw Schedule & SOV", status: "not_started" as const },
    { name: "Monthly Draw Requests", status: "not_started" as const },
    { name: "Lender Bank Inspections", status: "not_started" as const },
    { name: "Lien Waiver Management", status: "not_started" as const },
    { name: "Retainage Management", status: "not_started" as const },
    { name: "Budget Variance Tracking", status: "not_started" as const },
    { name: "Construction Loan Extension (if needed)", status: "not_started" as const },
  ]},
  { name: "Phase 14 — Certificate of Occupancy & Licensing", tasks: [
    { name: "Substantial Completion & Punch List", status: "not_started" as const },
    { name: "Final Inspections – County", status: "not_started" as const },
    { name: "TDLR Final Accessibility Inspection", status: "not_started" as const },
    { name: "Fire Marshal Final Inspection", status: "not_started" as const },
    { name: "Certificate of Occupancy Issuance", status: "not_started" as const },
    { name: "HHSC Final Licensing Inspection", status: "not_started" as const },
    { name: "Daycare License Issuance", status: "not_started" as const },
    { name: "Punch List Completion", status: "not_started" as const },
    { name: "As-Built Drawings", status: "not_started" as const },
  ]},
  { name: "Phase 15 — Turnover & Opening", tasks: [
    { name: "Utility Account Transfers", status: "not_started" as const },
    { name: "Owner/Operator Training", status: "not_started" as const },
    { name: "Warranty Documentation Package", status: "not_started" as const },
    { name: "Soft Opening – Staff Training Period", status: "not_started" as const },
    { name: "Grand Opening", status: "not_started" as const },
    { name: "Stabilization Period", status: "not_started" as const },
  ]},
  { name: "Phase 16 — Investor Payoff & Returns", tasks: [
    { name: "Quarterly Investor Reporting", status: "not_started" as const },
    { name: "Operating Cash Flow Distributions", status: "not_started" as const },
    { name: "Construction Loan Payoff / Conversion", status: "not_started" as const },
    { name: "Preferred Return Calculation", status: "not_started" as const },
    { name: "Profit Distribution / Equity Return", status: "not_started" as const },
    { name: "K-1 / Tax Reporting", status: "not_started" as const },
  ]},
  { name: "Phase 17 — Sale or Refinance", tasks: [
    { name: "Engage Commercial Real Estate Broker", status: "not_started" as const },
    { name: "Prepare Offering Memorandum (OM)", status: "not_started" as const },
    { name: "Market Property & Solicit Offers", status: "not_started" as const },
    { name: "Evaluate LOIs & Select Buyer", status: "not_started" as const },
    { name: "Execute Purchase & Sale Agreement", status: "not_started" as const },
    { name: "Buyer Due Diligence", status: "not_started" as const },
    { name: "Sale Closing", status: "not_started" as const },
    { name: "Proceeds Distribution to Investors", status: "not_started" as const },
    { name: "Entity Wind-Down & Tax Filings", status: "not_started" as const },
  ]},
  { name: "Phase 18 — Additional Critical Tasks", tasks: [
    { name: "Insurance Program – Development Phase", status: "not_started" as const },
    { name: "Insurance Program – Operations Phase", status: "not_started" as const },
    { name: "Playground Equipment Permit & Install", status: "not_started" as const },
    { name: "HHSC Staff Hiring & Credentialing", status: "not_started" as const },
    { name: "Technology & Security Systems", status: "not_started" as const },
    { name: "Health & Safety Plan Development", status: "not_started" as const },
    { name: "Signage – Exterior & Interior", status: "not_started" as const },
    { name: "Permanent Financing (if holding)", status: "not_started" as const },
    { name: "Marketing & Pre-Enrollment Campaign", status: "not_started" as const },
    { name: "Final Cost Reconciliation & Audit", status: "not_started" as const },
  ]},
];

async function main() {
  console.log("Seeding Summerlyn Daycare project plan...");

  const admin = await prisma.user.findFirst({ where: { roles: { some: { role: "admin" } } } });
  if (!admin) throw new Error("No admin user found — run main seed first");

  const project = await prisma.project.upsert({
    where: { id: "project-summerlyn-001" },
    update: {},
    create: {
      id: "project-summerlyn-001",
      name: "Summerlyn Daycare — Liberty Hill ETJ",
      description: "Commercial daycare development on a 1-acre ETJ parcel in Liberty Hill, Williamson County, TX. 18-phase comprehensive development plan covering land acquisition through investor payoff.",
      type: "both",
      budget: 4500000,
      targetReturn: 16.0,
      startDate: new Date("2025-06-01"),
      endDate: new Date("2027-06-01"),
      progressPct: 0,
      ragStatus: "green",
      isRecommended: false,
    },
  });

  console.log(`Project: ${project.name} (${project.id})`);

  // Clear existing phases to avoid duplicates
  await prisma.projectPhase.deleteMany({ where: { projectId: project.id } });

  for (let i = 0; i < PHASES.length; i++) {
    const phaseData = PHASES[i];
    const phase = await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        name: phaseData.name,
        status: "not_started",
        sortOrder: i + 1,
        startDate: new Date("2025-06-01"),
        endDate: new Date("2027-06-01"),
      },
    });

    await prisma.task.createMany({
      data: phaseData.tasks.map((t) => ({
        phaseId: phase.id,
        name: t.name,
        status: "not_started",
      })),
    });

    console.log(`  ${phaseData.name}: ${phaseData.tasks.length} tasks`);
  }

  console.log("\nDone! Summerlyn project plan seeded successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
