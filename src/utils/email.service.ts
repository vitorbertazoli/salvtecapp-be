import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private sesClient: SESClient;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, text, from } = options;

    const fromEmail = from || this.configService.get<string>('AWS_SES_FROM_EMAIL');
    if (!fromEmail) {
      throw new Error('From email not configured. Set AWS_SES_FROM_EMAIL environment variable.');
    }

    const toAddresses = Array.isArray(to) ? to : [to];

    const emailParams: SendEmailCommandInput = {
      Source: fromEmail,
      Destination: {
        ToAddresses: toAddresses
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
          Text: text ? { Data: text, Charset: 'UTF-8' } : undefined
        }
      }
    };

    try {
      const command = new SendEmailCommand(emailParams);
      await this.sesClient.send(command);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const subject = 'Welcome to Salvtec!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Welcome to Salvtec, ${userName}!</h2>
        <p>Thank you for joining Salvtec. Your account has been successfully created.</p>
        <p>You can now access all our features to manage your service business efficiently.</p>
        <div style="margin: 30px 0;">
          <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:8080')}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Get Started
          </a>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The Salvtec Team</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You have requested to reset your password. Click the button below to set a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The Salvtec Team</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html
    });
  }

  async sendQuoteNotification(to: string, quoteDetails: any): Promise<void> {
    const subject = `New Quote Available: ${quoteDetails.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Quote Available</h2>
        <p>A new quote has been created for you.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${quoteDetails.title}</h3>
          <p><strong>Total Value:</strong> $${quoteDetails.totalValue}</p>
          <p><strong>Valid Until:</strong> ${quoteDetails.validUntil}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:8080')}/quotes/${quoteDetails.id}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            View Quote
          </a>
        </div>
        <p>Best regards,<br>The Salvtec Team</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html
    });
  }
}
