import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const rawUrl = process.env.DATABASE_URL ?? "";
let connectionString = rawUrl;
try { const u = new URL(rawUrl); u.searchParams.delete("sslmode"); connectionString = u.toString(); } catch { /* ignore */ }

const pool = new Pool({ connectionString, ssl: rawUrl.length > 0 ? { rejectUnauthorized: false } : false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@demo.com",
      passwordHash: adminHash,
      phone: "+1-555-000-0001",
    },
  });

  // Create lender
  const lenderHash = await bcrypt.hash("lender123", 12);
  const lender = await prisma.user.upsert({
    where: { email: "lender@demo.com" },
    update: {},
    create: {
      name: "Sarah Johnson",
      email: "lender@demo.com",
      passwordHash: lenderHash,
      phone: "+1-555-000-0002",
    },
  });

  // Create investor
  const investorHash = await bcrypt.hash("investor123", 12);
  const investor = await prisma.user.upsert({
    where: { email: "investor@demo.com" },
    update: {},
    create: {
      name: "Michael Chen",
      email: "investor@demo.com",
      passwordHash: investorHash,
      phone: "+1-555-000-0003",
    },
  });

  // Create PM
  const pmHash = await bcrypt.hash("pm123", 12);
  const pm = await prisma.user.upsert({
    where: { email: "pm@demo.com" },
    update: {},
    create: {
      name: "Jessica Rivera",
      email: "pm@demo.com",
      passwordHash: pmHash,
      phone: "+1-555-000-0004",
    },
  });

  // Admin global role
  const existingAdminRole = await prisma.role.findFirst({
    where: { userId: admin.id, role: "admin", projectId: null },
  });
  if (!existingAdminRole) {
    await prisma.role.create({ data: { userId: admin.id, role: "admin" } });
  }

  // Create projects
  const project1 = await prisma.project.upsert({
    where: { id: "project-riverside-001" },
    update: {},
    create: {
      id: "project-riverside-001",
      name: "Riverside Condominiums Phase 1",
      description: "Luxury waterfront condominiums featuring 48 units across two buildings with modern amenities and direct river access.",
      type: "both",
      budget: 12500000,
      targetReturn: 14.5,
      startDate: new Date("2024-01-15"),
      endDate: new Date("2025-12-31"),
      progressPct: 65,
      ragStatus: "green",
      isRecommended: false,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "project-downtown-002" },
    update: {},
    create: {
      id: "project-downtown-002",
      name: "Downtown Mixed-Use Development",
      description: "A 12-story mixed-use tower with retail on ground floor and 84 residential units above. Prime downtown location.",
      type: "equity",
      budget: 28000000,
      targetReturn: 18.0,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2026-08-30"),
      progressPct: 30,
      ragStatus: "amber",
      isRecommended: true,
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: "project-suburban-003" },
    update: {},
    create: {
      id: "project-suburban-003",
      name: "Oakwood Townhomes",
      description: "32-unit townhome development in a growing suburban market with strong rental demand.",
      type: "lending",
      budget: 8500000,
      targetReturn: 12.0,
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-09-30"),
      progressPct: 15,
      ragStatus: "green",
      isRecommended: true,
    },
  });

  // Assign PM role
  await prisma.role.upsert({
    where: { userId_projectId_role: { userId: pm.id, projectId: project1.id, role: "pm" } },
    update: {},
    create: { userId: pm.id, projectId: project1.id, role: "pm" },
  });

  // Assign lender to project1
  await prisma.role.upsert({
    where: { userId_projectId_role: { userId: lender.id, projectId: project1.id, role: "lender" } },
    update: {},
    create: { userId: lender.id, projectId: project1.id, role: "lender" },
  });

  // Assign investor to project1 and project2
  await prisma.role.upsert({
    where: { userId_projectId_role: { userId: investor.id, projectId: project1.id, role: "investor" } },
    update: {},
    create: { userId: investor.id, projectId: project1.id, role: "investor" },
  });
  await prisma.role.upsert({
    where: { userId_projectId_role: { userId: investor.id, projectId: project2.id, role: "investor" } },
    update: {},
    create: { userId: investor.id, projectId: project2.id, role: "investor" },
  });

  // Lending position
  await prisma.lendingPosition.upsert({
    where: { id: "lend-pos-001" },
    update: {},
    create: {
      id: "lend-pos-001",
      userId: lender.id,
      projectId: project1.id,
      principal: 500000,
      apr: 0.125,
      startDate: new Date("2024-01-15"),
      maturityDate: new Date("2025-12-31"),
      status: "active",
    },
  });

  // Equity positions
  await prisma.equityPosition.upsert({
    where: { id: "eq-pos-001" },
    update: {},
    create: {
      id: "eq-pos-001",
      userId: investor.id,
      projectId: project1.id,
      amountInvested: 750000,
      equitySharePct: 6.0,
      projectedReturn: 1087500,
    },
  });

  await prisma.equityPosition.upsert({
    where: { id: "eq-pos-002" },
    update: {},
    create: {
      id: "eq-pos-002",
      userId: investor.id,
      projectId: project2.id,
      amountInvested: 1000000,
      equitySharePct: 3.57,
      projectedReturn: 1420000,
    },
  });

  // Bank account for lender
  await prisma.bankAccount.upsert({
    where: { id: "ba-lender-001" },
    update: {},
    create: {
      id: "ba-lender-001",
      userId: lender.id,
      accountHolder: "Sarah Johnson",
      bankName: "Chase Bank",
      accountType: "checking",
      routingLast4: "0021",
      accountLast4: "4521",
      routingEncrypted: "demo-encrypted-routing",
      accountEncrypted: "demo-encrypted-account",
      nickname: "Personal Checking",
      isPrimary: true,
      verificationStatus: "verified",
      verifiedAt: new Date("2024-01-20"),
    },
  });

  // Bank account for investor
  await prisma.bankAccount.upsert({
    where: { id: "ba-investor-001" },
    update: {},
    create: {
      id: "ba-investor-001",
      userId: investor.id,
      accountHolder: "Michael Chen",
      bankName: "Bank of America",
      accountType: "business_checking",
      routingLast4: "0358",
      accountLast4: "8832",
      routingEncrypted: "demo-encrypted-routing",
      accountEncrypted: "demo-encrypted-account",
      nickname: "Business Account",
      isPrimary: true,
      verificationStatus: "verified",
      verifiedAt: new Date("2024-06-05"),
    },
  });

  // Milestones for project1
  const milestones = [
    { name: "Site Preparation Complete", targetDate: new Date("2024-03-01"), completedAt: new Date("2024-02-28"), sortOrder: 1 },
    { name: "Foundation Pour", targetDate: new Date("2024-05-15"), completedAt: new Date("2024-05-10"), sortOrder: 2 },
    { name: "Structural Frame - Building A", targetDate: new Date("2024-08-30"), completedAt: new Date("2024-08-25"), sortOrder: 3 },
    { name: "Structural Frame - Building B", targetDate: new Date("2024-10-15"), completedAt: null, sortOrder: 4 },
    { name: "MEP Rough-in Complete", targetDate: new Date("2025-02-28"), completedAt: null, sortOrder: 5 },
    { name: "Interior Finishes", targetDate: new Date("2025-07-31"), completedAt: null, sortOrder: 6 },
    { name: "Certificate of Occupancy", targetDate: new Date("2025-11-30"), completedAt: null, sortOrder: 7 },
  ];

  for (const m of milestones) {
    await prisma.milestone.create({
      data: { projectId: project1.id, ...m },
    }).catch(() => {}); // Ignore duplicates
  }

  // Phases and tasks for project1
  const phase1 = await prisma.projectPhase.create({
    data: {
      projectId: project1.id,
      name: "Pre-Construction",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-04-30"),
      status: "complete",
      sortOrder: 1,
    },
  }).catch(async () => {
    return prisma.projectPhase.findFirst({ where: { projectId: project1.id, name: "Pre-Construction" } });
  });

  if (phase1) {
    await prisma.task.createMany({
      data: [
        { phaseId: phase1.id, name: "Permits & approvals", status: "complete", completedAt: new Date("2024-02-01") },
        { phaseId: phase1.id, name: "Site survey", status: "complete", completedAt: new Date("2024-02-15") },
        { phaseId: phase1.id, name: "Contractor selection", status: "complete", completedAt: new Date("2024-03-01") },
      ],
      skipDuplicates: true,
    });
  }

  // Expenses
  await prisma.expense.createMany({
    data: [
      { projectId: project1.id, date: new Date("2024-02-15"), amount: 45000, category: "permits_legal", vendor: "City Planning Dept", invoiceNumber: "CITY-2024-001", createdBy: admin.id },
      { projectId: project1.id, date: new Date("2024-03-10"), amount: 125000, category: "architecture_design", vendor: "Smith & Associates Architects", invoiceNumber: "SAA-0234", createdBy: admin.id },
      { projectId: project1.id, date: new Date("2024-04-20"), amount: 890000, category: "construction", vendor: "BuildRight General Contractors", invoiceNumber: "BRC-2024-041", createdBy: admin.id },
      { projectId: project1.id, date: new Date("2024-06-15"), amount: 325000, category: "materials", vendor: "Pacific Steel & Lumber", invoiceNumber: "PSL-6042", createdBy: admin.id },
      { projectId: project1.id, date: new Date("2024-08-01"), amount: 58000, category: "management_fees", vendor: "PM Consulting Group", invoiceNumber: "PMCG-0089", createdBy: admin.id },
    ],
    skipDuplicates: true,
  });

  // Payouts
  await prisma.payout.createMany({
    data: [
      { projectId: project1.id, userId: lender.id, date: new Date("2024-04-15"), amount: 15625, type: "interest_payment", reference: "PAY-2024-Q1", notes: "Q1 interest payment", createdBy: admin.id },
      { projectId: project1.id, userId: lender.id, date: new Date("2024-07-15"), amount: 15625, type: "interest_payment", reference: "PAY-2024-Q2", notes: "Q2 interest payment", createdBy: admin.id },
    ],
    skipDuplicates: true,
  });

  // Tracker updates
  await prisma.trackerUpdate.createMany({
    data: [
      { projectId: project1.id, title: "Foundation pour completed on schedule", updateType: "milestone", status: "closed", notes: "All footings inspected and approved. Ready for framing.", notifyPartners: true, createdBy: admin.id },
      { projectId: project1.id, title: "Material delivery delay — steel beams", updateType: "issue", status: "resolved", notes: "Steel delivery delayed 2 weeks due to supply chain issues. Alternative supplier sourced.", notifyPartners: true, createdBy: pm.id },
      { projectId: project1.id, title: "Building A framing 80% complete", updateType: "info", status: "closed", notes: "Progress ahead of schedule. Expecting to complete 2 weeks early.", notifyPartners: false, createdBy: pm.id },
    ],
    skipDuplicates: true,
  });

  // Financial model items
  await prisma.financialModel.createMany({
    data: [
      { projectId: project1.id, itemType: "source", label: "Lender — Sarah Johnson", projectedAmount: 500000, actualAmount: 500000, sortOrder: 1 },
      { projectId: project1.id, itemType: "source", label: "Investor — Michael Chen", projectedAmount: 750000, actualAmount: 750000, sortOrder: 2 },
      { projectId: project1.id, itemType: "source", label: "Sponsor Equity", projectedAmount: 1250000, actualAmount: 1250000, sortOrder: 3 },
      { projectId: project1.id, itemType: "use", label: "Land Acquisition", projectedAmount: 2500000, actualAmount: 2500000, sortOrder: 1 },
      { projectId: project1.id, itemType: "use", label: "Hard Construction Costs", projectedAmount: 7800000, actualAmount: 1340000, sortOrder: 2 },
      { projectId: project1.id, itemType: "use", label: "Soft Costs (A&E, Permits)", projectedAmount: 850000, actualAmount: 170000, sortOrder: 3 },
      { projectId: project1.id, itemType: "use", label: "Financing Costs", projectedAmount: 625000, actualAmount: 31250, sortOrder: 4 },
      { projectId: project1.id, itemType: "use", label: "Contingency (10%)", projectedAmount: 725000, actualAmount: 0, sortOrder: 5 },
      { projectId: project1.id, itemType: "revenue", label: "Unit Sales (48 units @ avg $425k)", projectedAmount: 20400000, actualAmount: null, sortOrder: 1 },
      { projectId: project1.id, itemType: "revenue", label: "Parking & Storage", projectedAmount: 480000, actualAmount: null, sortOrder: 2 },
      { projectId: project1.id, itemType: "return_item", label: "Lender Interest — Sarah Johnson", projectedAmount: 125000, actualAmount: 31250, sortOrder: 1 },
      { projectId: project1.id, itemType: "return_item", label: "Investor Profit — Michael Chen (6%)", projectedAmount: 337500, actualAmount: 0, sortOrder: 2 },
    ],
    skipDuplicates: true,
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: lender.id, type: "interest_payment", title: "Interest Payment Received", body: "Your Q2 2024 interest payment of $15,625 has been processed.", isRead: false },
      { userId: lender.id, type: "milestone_complete", title: "Milestone Completed", body: "The Foundation Pour milestone on Riverside Condominiums Phase 1 has been completed.", isRead: true },
      { userId: investor.id, type: "rag_status_change", title: "Project Status Update", body: "Downtown Mixed-Use Development status changed to Amber — Some Concerns.", isRead: false },
      { userId: investor.id, type: "payout", title: "Payout Available", body: "Your Q2 equity distribution for Riverside Condominiums is ready.", isRead: false },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete!");
  console.log("Login credentials:");
  console.log("  Admin: admin@demo.com / admin123");
  console.log("  Lender: lender@demo.com / lender123");
  console.log("  Investor: investor@demo.com / investor123");
  console.log("  PM: pm@demo.com / pm123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
