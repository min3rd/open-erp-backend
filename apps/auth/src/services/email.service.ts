import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private bypassEmail: boolean;

  constructor() {
    this.bypassEmail = process.env.VERIFICATION_EMAIL_BYPASS === 'true';

    if (!this.bypassEmail) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      this.logger.warn('Email sending is BYPASSED - emails will be logged but not sent');
    }
  }

  /**
   * Send verification email with code
   * @param to - Recipient email address
   * @param fullName - Recipient full name
   * @param verificationCode - 6-digit verification code
   */
  async sendVerificationEmail(
    to: string,
    fullName: string,
    verificationCode: string,
  ): Promise<void> {
    try {
      const { subject, body } = await this.loadEmailTemplate(fullName, verificationCode);

      if (this.bypassEmail) {
        this.logger.log(`[BYPASS] Verification email for ${to}:`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Code: ${verificationCode}`);
        return;
      }

      const info = await this.transporter.sendMail({
        from: process.env.AUTH_EMAIL_FROM || '"Open ERP" <noreply@open-erp.com>',
        to,
        subject,
        text: body,
        html: this.convertToHtml(body),
      });

      this.logger.log(`Verification email sent successfully to ${to}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}: ${error.message}`, error.stack);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Load email template from VERIFY_EMAIL.md file
   */
  private async loadEmailTemplate(
    fullName: string,
    verificationCode: string,
  ): Promise<{ subject: string; body: string }> {
    try {
      const templatePath = path.join(__dirname, '../../templates/VERIFY_EMAIL.md');
      const template = await fs.readFile(templatePath, 'utf-8');

      // Extract subject (first line starting with #)
      const lines = template.split('\n');
      const subjectLine = lines.find(line => line.startsWith('#'));
      const subject = subjectLine ? subjectLine.replace(/^#+\s*/, '').trim() : 'Email Verification';

      // Replace placeholders
      const body = template
        .replace(/{{fullName}}/g, fullName)
        .replace(/{{verificationCode}}/g, verificationCode)
        .replace(/{{expiryMinutes}}/g, process.env.VERIFICATION_TOKEN_TTL || '15');

      return { subject, body };
    } catch (error) {
      this.logger.error(`Failed to load email template: ${error.message}`);
      // Fallback to default template
      return {
        subject: 'Email Verification',
        body: `Hello ${fullName},\n\nYour verification code is: ${verificationCode}\n\nThis code will expire in ${process.env.VERIFICATION_TOKEN_TTL || '15'} minutes.\n\nBest regards,\nOpen ERP Team`,
      };
    }
  }

  /**
   * Convert markdown-style text to basic HTML
   */
  private convertToHtml(text: string): string {
    return text
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/, '<p>$1</p>');
  }
}
