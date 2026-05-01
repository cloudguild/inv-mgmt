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
  {
    name: "Phase 1 — Land Acquisition",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-07-10"),
    tasks: [
      { name: "Identify & Select Target Parcel", dueDate: new Date("2025-06-07") },
      { name: "Engage Real Estate Attorney", dueDate: new Date("2025-06-07") },
      { name: "Execute Letter of Intent (LOI)", dueDate: new Date("2025-06-10") },
      { name: "Open Escrow & Deposit Earnest Money", dueDate: new Date("2025-06-12") },
      { name: "Title Search & Commitment", dueDate: new Date("2025-06-24") },
      { name: "ALTA/NSPS Land Survey", dueDate: new Date("2025-06-28") },
      { name: "Phase I Environmental Site Assessment", dueDate: new Date("2025-06-28") },
      { name: "Geotechnical / Soils Investigation", dueDate: new Date("2025-07-05") },
      { name: "ETJ / Zoning & Land Use Confirmation", dueDate: new Date("2025-06-15") },
      { name: "Utility Availability Study", dueDate: new Date("2025-06-25") },
      { name: "Execute Purchase & Sale Agreement", dueDate: new Date("2025-07-02") },
      { name: "Due Diligence Review & Go/No-Go", dueDate: new Date("2025-07-10") },
    ],
  },
  {
    name: "Phase 2 — Land Closing",
    startDate: new Date("2025-06-10"),
    endDate: new Date("2025-07-28"),
    tasks: [
      { name: "Form Legal Entity (LLC/LP)", dueDate: new Date("2025-06-20") },
      { name: "Open Entity Bank Account", dueDate: new Date("2025-06-25") },
      { name: "Finalize Title Insurance Commitment", dueDate: new Date("2025-07-05") },
      { name: "Closing Disclosure & Wire Instructions", dueDate: new Date("2025-07-12") },
      { name: "Land Closing", dueDate: new Date("2025-07-14") },
      { name: "Deed & Title Policy Delivery", dueDate: new Date("2025-07-21") },
      { name: "Post-Closing Entity & Tax Setup", dueDate: new Date("2025-07-28") },
    ],
  },
  {
    name: "Phase 3 — Funding & Financing",
    startDate: new Date("2025-07-01"),
    endDate: new Date("2025-10-05"),
    tasks: [
      { name: "Develop Pro Forma & Financial Model", dueDate: new Date("2025-07-15") },
      { name: "Prepare Investor Deck & PPM", dueDate: new Date("2025-07-25") },
      { name: "Equity Capital Raise", dueDate: new Date("2025-08-20") },
      { name: "Investor Agreements & Closing Docs", dueDate: new Date("2025-08-25") },
      { name: "Select Construction Lender", dueDate: new Date("2025-08-01") },
      { name: "Construction Loan Application Package", dueDate: new Date("2025-08-20") },
      { name: "Bank Underwriting & Appraisal", dueDate: new Date("2025-09-20") },
      { name: "Loan Commitment Letter", dueDate: new Date("2025-09-27") },
      { name: "Construction Loan Closing", dueDate: new Date("2025-10-05") },
    ],
  },
  {
    name: "Phase 4 — Civil & Engineering Plans",
    startDate: new Date("2025-07-15"),
    endDate: new Date("2025-10-12"),
    tasks: [
      { name: "Issue RFP & Select Civil Engineer", dueDate: new Date("2025-07-28") },
      { name: "Civil Engineering Agreement", dueDate: new Date("2025-08-03") },
      { name: "Topographic Survey", dueDate: new Date("2025-07-28") },
      { name: "Utility Coordination", dueDate: new Date("2025-08-15") },
      { name: "Flood Plain Analysis & FEMA Review", dueDate: new Date("2025-08-01") },
      { name: "Site Plan Design (Civil)", dueDate: new Date("2025-09-07") },
      { name: "Drainage & Detention Design", dueDate: new Date("2025-09-21") },
      { name: "Water Quality / SWPPP", dueDate: new Date("2025-09-15") },
      { name: "Utility Plans (Civil)", dueDate: new Date("2025-09-28") },
      { name: "100% Civil Plan Set", dueDate: new Date("2025-10-12") },
    ],
  },
  {
    name: "Phase 5 — Architecture & Building Plans",
    startDate: new Date("2025-07-15"),
    endDate: new Date("2025-11-30"),
    tasks: [
      { name: "Issue RFP & Select Architect", dueDate: new Date("2025-07-28") },
      { name: "Architecture Agreement", dueDate: new Date("2025-08-03") },
      { name: "Programming & Space Planning", dueDate: new Date("2025-08-17") },
      { name: "Schematic Design (SD)", dueDate: new Date("2025-09-07") },
      { name: "Design Development (DD)", dueDate: new Date("2025-10-05") },
      { name: "Construction Documents (CDs)", dueDate: new Date("2025-11-16") },
      { name: "ADA / TAS Compliance Review", dueDate: new Date("2025-11-23") },
      { name: "Fire Marshal Pre-Application Meeting", dueDate: new Date("2025-11-16") },
      { name: "Energy Code Compliance (IECC)", dueDate: new Date("2025-11-23") },
      { name: "100% CD Plan Set & Specifications", dueDate: new Date("2025-11-30") },
    ],
  },
  {
    name: "Phase 6 — County & City Submittals",
    startDate: new Date("2025-11-30"),
    endDate: new Date("2026-02-20"),
    tasks: [
      { name: "Pre-Submittal Meeting – Williamson County", dueDate: new Date("2025-12-07") },
      { name: "ETJ Permit Application Submittal", dueDate: new Date("2025-12-10") },
      { name: "Liberty Hill Coordination (if applicable)", dueDate: new Date("2025-12-21") },
      { name: "County Plan Review – Round 1", dueDate: new Date("2026-01-09") },
      { name: "Response to County Comments – Round 1", dueDate: new Date("2026-01-23") },
      { name: "County Plan Review – Round 2", dueDate: new Date("2026-02-06") },
      { name: "Response to County Comments – Round 2 (if needed)", dueDate: new Date("2026-02-13") },
      { name: "Final Plan Approval", dueDate: new Date("2026-02-20") },
    ],
  },
  {
    name: "Phase 7 — Permits & Approvals",
    startDate: new Date("2025-10-01"),
    endDate: new Date("2026-03-06"),
    tasks: [
      { name: "Grading / Site Development Permit", dueDate: new Date("2026-02-27") },
      { name: "TCEQ NOI – Construction General Permit", dueDate: new Date("2025-10-08") },
      { name: "Building Permit Issuance", dueDate: new Date("2026-02-27") },
      { name: "Utility Permits", dueDate: new Date("2026-03-06") },
      { name: "HHSC Daycare License Pre-Application", dueDate: new Date("2025-11-15") },
      { name: "TDLR Accessibility Registration", dueDate: new Date("2025-11-30") },
      { name: "Fire Marshal Permit", dueDate: new Date("2026-03-06") },
    ],
  },
  {
    name: "Phase 8 — Contractor Procurement",
    startDate: new Date("2025-11-30"),
    endDate: new Date("2026-02-22"),
    tasks: [
      { name: "Develop Bid Package", dueDate: new Date("2025-12-14") },
      { name: "Advertise & Solicit Bids", dueDate: new Date("2026-01-04") },
      { name: "Receive & Evaluate Bids", dueDate: new Date("2026-01-11") },
      { name: "Contractor Interviews & Negotiations", dueDate: new Date("2026-01-25") },
      { name: "GC Contract Execution", dueDate: new Date("2026-02-01") },
      { name: "Performance & Payment Bonds", dueDate: new Date("2026-02-08") },
      { name: "Subcontractor Awards", dueDate: new Date("2026-02-22") },
      { name: "Pre-Construction Meeting", dueDate: new Date("2026-02-22") },
    ],
  },
  {
    name: "Phase 9 — Horizontal Construction",
    startDate: new Date("2026-03-01"),
    endDate: new Date("2026-05-30"),
    tasks: [
      { name: "Mobilization & Temporary Facilities", dueDate: new Date("2026-03-07") },
      { name: "Site Clearing & Demolition", dueDate: new Date("2026-03-14") },
      { name: "Rough Grading", dueDate: new Date("2026-03-28") },
      { name: "Underground Utilities – Wet", dueDate: new Date("2026-04-18") },
      { name: "Underground Utilities – Dry", dueDate: new Date("2026-04-11") },
      { name: "Detention / Water Quality Construction", dueDate: new Date("2026-04-25") },
      { name: "Subgrade Preparation & Base Course", dueDate: new Date("2026-05-02") },
      { name: "Paving & Concrete Flatwork", dueDate: new Date("2026-05-23") },
      { name: "Utility Connections & Meters", dueDate: new Date("2026-05-16") },
      { name: "Horizontal Inspection & Sign-Off", dueDate: new Date("2026-05-30") },
    ],
  },
  {
    name: "Phase 10 — Vertical Construction",
    startDate: new Date("2026-05-02"),
    endDate: new Date("2026-08-25"),
    tasks: [
      { name: "Building Layout & Foundation Prep", dueDate: new Date("2026-05-09") },
      { name: "Foundation – Slab on Grade or Pier & Beam", dueDate: new Date("2026-05-30") },
      { name: "Structural Steel / Framing", dueDate: new Date("2026-07-11") },
      { name: "Roofing System", dueDate: new Date("2026-07-25") },
      { name: "MEP Rough-Ins (Mechanical)", dueDate: new Date("2026-08-08") },
      { name: "MEP Rough-Ins (Electrical)", dueDate: new Date("2026-08-08") },
      { name: "MEP Rough-Ins (Plumbing)", dueDate: new Date("2026-07-11") },
      { name: "Fire Sprinkler Rough-In", dueDate: new Date("2026-08-01") },
      { name: "Exterior Envelope – Sheathing & Weather Barrier", dueDate: new Date("2026-08-08") },
      { name: "Exterior Cladding & Windows/Doors", dueDate: new Date("2026-09-05") },
      { name: "MEP Inspections – Rough-In", dueDate: new Date("2026-08-15") },
      { name: "Insulation", dueDate: new Date("2026-08-22") },
      { name: "Drywall & Exterior Sheathing Inspection", dueDate: new Date("2026-08-25") },
    ],
  },
  {
    name: "Phase 11 — Interior Buildout Permits",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-09-15"),
    tasks: [
      { name: "Interior Permit Package Preparation", dueDate: new Date("2026-08-15") },
      { name: "Health Department Pre-Inspection", dueDate: new Date("2026-08-22") },
      { name: "HHSC Facility Pre-Inspection", dueDate: new Date("2026-09-15") },
      { name: "Fire Marshal Walkthrough – Interior", dueDate: new Date("2026-09-01") },
    ],
  },
  {
    name: "Phase 12 — Interior Buildout",
    startDate: new Date("2026-08-25"),
    endDate: new Date("2026-11-23"),
    tasks: [
      { name: "Drywall & Interior Framing", dueDate: new Date("2026-09-19") },
      { name: "Interior Doors & Hardware", dueDate: new Date("2026-10-03") },
      { name: "Flooring", dueDate: new Date("2026-10-17") },
      { name: "Ceilings – Grid & Tile", dueDate: new Date("2026-10-10") },
      { name: "MEP Trim-Out (Mechanical)", dueDate: new Date("2026-10-24") },
      { name: "MEP Trim-Out (Electrical)", dueDate: new Date("2026-10-31") },
      { name: "MEP Trim-Out (Plumbing)", dueDate: new Date("2026-10-24") },
      { name: "Fire Alarm & Security Systems", dueDate: new Date("2026-11-07") },
      { name: "Painting & Wall Finishes", dueDate: new Date("2026-11-07") },
      { name: "Casework, Millwork & Cabinetry", dueDate: new Date("2026-11-07") },
      { name: "FF&E Installation", dueDate: new Date("2026-11-21") },
      { name: "Landscaping & Site Finishes", dueDate: new Date("2026-11-14") },
      { name: "Final Cleaning", dueDate: new Date("2026-11-23") },
    ],
  },
  {
    name: "Phase 13 — Bank Draw Management",
    startDate: new Date("2026-02-22"),
    endDate: new Date("2026-12-01"),
    tasks: [
      { name: "Establish Draw Schedule & SOV", dueDate: new Date("2026-03-01") },
      { name: "Monthly Draw Requests", dueDate: new Date("2026-11-01") },
      { name: "Lender Bank Inspections", dueDate: new Date("2026-11-01") },
      { name: "Lien Waiver Management", dueDate: new Date("2026-11-01") },
      { name: "Retainage Management", dueDate: new Date("2026-12-01") },
      { name: "Budget Variance Tracking", dueDate: new Date("2026-12-01") },
      { name: "Construction Loan Extension (if needed)", dueDate: new Date("2026-08-15") },
    ],
  },
  {
    name: "Phase 14 — Certificate of Occupancy & Licensing",
    startDate: new Date("2026-11-23"),
    endDate: new Date("2026-12-28"),
    tasks: [
      { name: "Substantial Completion & Punch List", dueDate: new Date("2026-11-27") },
      { name: "Final Inspections – County", dueDate: new Date("2026-12-07") },
      { name: "TDLR Final Accessibility Inspection", dueDate: new Date("2026-12-14") },
      { name: "Fire Marshal Final Inspection", dueDate: new Date("2026-12-14") },
      { name: "Certificate of Occupancy Issuance", dueDate: new Date("2026-12-17") },
      { name: "HHSC Final Licensing Inspection", dueDate: new Date("2027-01-07") },
      { name: "Daycare License Issuance", dueDate: new Date("2027-01-14") },
      { name: "Punch List Completion", dueDate: new Date("2026-12-14") },
      { name: "As-Built Drawings", dueDate: new Date("2026-12-28") },
    ],
  },
  {
    name: "Phase 15 — Turnover & Opening",
    startDate: new Date("2026-12-17"),
    endDate: new Date("2027-07-21"),
    tasks: [
      { name: "Utility Account Transfers", dueDate: new Date("2026-12-24") },
      { name: "Owner/Operator Training", dueDate: new Date("2026-12-24") },
      { name: "Warranty Documentation Package", dueDate: new Date("2026-12-28") },
      { name: "Soft Opening – Staff Training Period", dueDate: new Date("2027-01-21") },
      { name: "Grand Opening", dueDate: new Date("2027-01-21") },
      { name: "Stabilization Period", dueDate: new Date("2027-07-21") },
    ],
  },
  {
    name: "Phase 16 — Investor Payoff & Returns",
    startDate: new Date("2027-01-01"),
    endDate: new Date("2028-04-15"),
    tasks: [
      { name: "Quarterly Investor Reporting", dueDate: new Date("2027-12-31") },
      { name: "Operating Cash Flow Distributions", dueDate: new Date("2027-12-31") },
      { name: "Construction Loan Payoff / Conversion", dueDate: new Date("2027-08-21") },
      { name: "Preferred Return Calculation", dueDate: new Date("2027-08-01") },
      { name: "Profit Distribution / Equity Return", dueDate: new Date("2027-09-01") },
      { name: "K-1 / Tax Reporting", dueDate: new Date("2028-04-15") },
    ],
  },
  {
    name: "Phase 17 — Sale or Refinance",
    startDate: new Date("2027-04-21"),
    endDate: new Date("2028-06-30"),
    tasks: [
      { name: "Engage Commercial Real Estate Broker", dueDate: new Date("2027-05-01") },
      { name: "Prepare Offering Memorandum (OM)", dueDate: new Date("2027-05-21") },
      { name: "Market Property & Solicit Offers", dueDate: new Date("2027-07-05") },
      { name: "Evaluate LOIs & Select Buyer", dueDate: new Date("2027-07-19") },
      { name: "Execute Purchase & Sale Agreement", dueDate: new Date("2027-07-26") },
      { name: "Buyer Due Diligence", dueDate: new Date("2027-08-25") },
      { name: "Sale Closing", dueDate: new Date("2027-09-01") },
      { name: "Proceeds Distribution to Investors", dueDate: new Date("2027-09-15") },
      { name: "Entity Wind-Down & Tax Filings", dueDate: new Date("2028-06-30") },
    ],
  },
  {
    name: "Phase 18 — Additional Critical Tasks",
    startDate: new Date("2026-02-15"),
    endDate: new Date("2027-10-01"),
    tasks: [
      { name: "Insurance Program – Development Phase", dueDate: new Date("2026-03-01") },
      { name: "Insurance Program – Operations Phase", dueDate: new Date("2027-01-07") },
      { name: "Playground Equipment Permit & Install", dueDate: new Date("2026-11-07") },
      { name: "HHSC Staff Hiring & Credentialing", dueDate: new Date("2027-01-07") },
      { name: "Technology & Security Systems", dueDate: new Date("2026-11-14") },
      { name: "Health & Safety Plan Development", dueDate: new Date("2026-12-01") },
      { name: "Signage – Exterior & Interior", dueDate: new Date("2026-11-21") },
      { name: "Permanent Financing (if holding)", dueDate: new Date("2027-07-21") },
      { name: "Marketing & Pre-Enrollment Campaign", dueDate: new Date("2027-01-21") },
      { name: "Final Cost Reconciliation & Audit", dueDate: new Date("2027-10-01") },
    ],
  },
];

async function main() {
  console.log("Seeding Summerlyn Daycare project plan...");

  const admin = await prisma.user.findFirst({ where: { roles: { some: { role: "admin" } } } });
  if (!admin) throw new Error("No admin user found — run main seed first");

  const project = await prisma.project.upsert({
    where: { id: "project-summerlyn-001" },
    update: {
      name: "Summerlyn Daycare — Liberty Hill ETJ",
      description: "Commercial daycare development on a 1-acre ETJ parcel in Liberty Hill, Williamson County, TX. 18-phase comprehensive development plan covering land acquisition through investor payoff.",
      budget: 4500000,
      targetReturn: 16.0,
      startDate: new Date("2025-06-01"),
      endDate: new Date("2027-07-21"),
    },
    create: {
      id: "project-summerlyn-001",
      name: "Summerlyn Daycare — Liberty Hill ETJ",
      description: "Commercial daycare development on a 1-acre ETJ parcel in Liberty Hill, Williamson County, TX. 18-phase comprehensive development plan covering land acquisition through investor payoff.",
      type: "both",
      budget: 4500000,
      targetReturn: 16.0,
      startDate: new Date("2025-06-01"),
      endDate: new Date("2027-07-21"),
      progressPct: 0,
      ragStatus: "green",
      isRecommended: false,
    },
  });

  console.log(`Project: ${project.name} (${project.id})`);

  // Clear existing phases to avoid duplicates
  await prisma.projectPhase.deleteMany({ where: { projectId: project.id } });

  let totalTasks = 0;
  for (let i = 0; i < PHASES.length; i++) {
    const phaseData = PHASES[i];
    const phase = await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        name: phaseData.name,
        status: "not_started",
        sortOrder: i + 1,
        startDate: phaseData.startDate,
        endDate: phaseData.endDate,
      },
    });

    await prisma.task.createMany({
      data: phaseData.tasks.map((t) => ({
        phaseId: phase.id,
        name: t.name,
        status: "not_started",
        dueDate: t.dueDate,
      })),
    });

    totalTasks += phaseData.tasks.length;
    console.log(`  ${phaseData.name}: ${phaseData.tasks.length} tasks`);
  }

  console.log(`\nDone! Summerlyn project seeded — ${PHASES.length} phases, ${totalTasks} tasks.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
