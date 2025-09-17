import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@kokzhiek.com';
    this.fromName = process.env.FROM_NAME || 'Kokzhiek Editor';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendWelcomeEmail(email: string, firstName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h1>Welcome to Kokzhiek Editor!</h1>
        <p>Hello ${firstName},</p>
        <p>Thank you for joining Kokzhiek Editor. We're excited to have you on board!</p>
        <p>To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Kokzhiek Editor Team
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Kokzhiek Editor - Verify Your Email',
      html,
      text: `Welcome to Kokzhiek Editor! Please verify your email by visiting: ${verificationUrl}`
    });
  }

  async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h1>Verify Your Email Address</h1>
        <p>Hello ${firstName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Kokzhiek Editor Team
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text: `Please verify your email by visiting: ${verificationUrl}`
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h1>Reset Your Password</h1>
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password for your Kokzhiek Editor account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p><strong>This password reset link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email. Your password will not be changed.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Kokzhiek Editor Team
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
      text: `Reset your password by visiting: ${resetUrl} (expires in 1 hour)`
    });
  }

  async sendCollaborationInvite(email: string, inviterName: string, bookTitle: string, role: string, inviteToken: string): Promise<void> {
    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h1>You've Been Invited to Collaborate!</h1>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to collaborate on "<strong>${bookTitle}</strong>" as a <strong>${role}</strong>.</p>
        <p>Click the button below to accept the invitation:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${acceptUrl}">${acceptUrl}</a></p>
        <p>If you don't have a Kokzhiek Editor account, you'll be able to create one during the invitation process.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Best regards,<br>
          The Kokzhiek Editor Team
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: `Invitation to collaborate on "${bookTitle}"`,
      html,
      text: `${inviterName} has invited you to collaborate on "${bookTitle}" as a ${role}. Accept the invitation: ${acceptUrl}`
    });
  }
}