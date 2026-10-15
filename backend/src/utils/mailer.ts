import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const from = process.env.SMTP_FROM || 'Smart Study Planner <noreply@smartstudyplanner.com>';

  if (transporter) {
    try {
      await transporter.sendMail({ from, to, subject, html, text });
      console.log(`📧 [Email Sent] Successfully delivered email to: ${to} (Subject: "${subject}")`);
      return { success: true, mode: 'smtp' };
    } catch (error) {
      console.error(`❌ [Email Error] Failed to send email to ${to}:`, error);
      // Fallback to console output in development
    }
  }

  // Development fallback: print directly to server console so user can test without SMTP
  console.log('\n======================================================');
  console.log(`✉️ [MOCK EMAIL DELIVERY] To: ${to}`);
  console.log(`📌 Subject: ${subject}`);
  console.log('------------------------------------------------------');
  console.log(text);
  console.log('======================================================\n');
  return { success: true, mode: 'console' };
}

export async function sendVerificationEmail(email: string, rawToken: string) {
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const verificationLink = `${appBaseUrl}/verify-email?token=${rawToken}`;

  const subject = 'Verify your email — Smart Study Planner';
  const text = `Welcome to Smart Study Planner!\n\nPlease verify your email address by clicking the link below:\n${verificationLink}\n\nThis link will expire in 24 hours.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #4f46e5;">Welcome to Smart Study Planner! 📚</h2>
      <p>Thank you for signing up. Please verify your email address to activate your account and start your personalized study journey.</p>
      <div style="margin: 24px 0;">
        <a href="${verificationLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #4f46e5; font-size: 13px;">${verificationLink}</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link will expire in 24 hours. If you did not create this account, please ignore this email.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(email: string, rawToken: string) {
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const resetLink = `${appBaseUrl}/reset-password?token=${rawToken}`;

  const subject = 'Reset your password — Smart Study Planner';
  const text = `You requested a password reset for your Smart Study Planner account.\n\nClick the link below to set a new password:\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #dc2626;">Password Reset Request 🔐</h2>
      <p>We received a request to reset your password for your Smart Study Planner account.</p>
      <div style="margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset My Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Or copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #dc2626; font-size: 13px;">${resetLink}</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This link will expire in 1 hour. If you did not request this change, please ignore this email or review your account security.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
}
