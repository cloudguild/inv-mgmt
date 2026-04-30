import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || "apikey",
    pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || "",
  },
});

const FROM = process.env.FROM_EMAIL || "noreply@investorportal.com";

async function send(to: string, subject: string, html: string) {
  if (!process.env.SMTP_PASS && !process.env.SENDGRID_API_KEY) return;
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (e) {
    console.error("[email] send error:", e);
  }
}

export async function sendWelcomeEmail(to: string, name: string, password: string) {
  await send(to, "Welcome to Investor Portal", `
    <h2>Welcome, ${name}!</h2>
    <p>Your account has been created on the Investor Portal.</p>
    <p><strong>Email:</strong> ${to}<br/>
    <strong>Temporary Password:</strong> ${password}</p>
    <p>Please log in and change your password.</p>
  `);
}

export async function sendDeactivationEmail(to: string, name: string) {
  await send(to, "Account Deactivated", `
    <h2>Account Deactivated</h2>
    <p>Hi ${name}, your Investor Portal account has been deactivated by an administrator.</p>
    <p>If you believe this is a mistake, please contact your administrator.</p>
  `);
}

export async function sendProfileUpdateEmail(to: string, name: string, changes: string[]) {
  await send(to, "Account Updated", `
    <h2>Account Updated</h2>
    <p>Hi ${name}, the following changes were made to your Investor Portal account:</p>
    <ul>${changes.map((c) => `<li>${c}</li>`).join("")}</ul>
    <p>If you did not authorize these changes, contact your administrator immediately.</p>
  `);
}

export async function sendDeletionEmail(to: string, name: string) {
  await send(to, "Account Removed", `
    <h2>Account Removed</h2>
    <p>Hi ${name}, your Investor Portal account has been permanently removed.</p>
    <p>If you believe this is a mistake, please contact your administrator.</p>
  `);
}
