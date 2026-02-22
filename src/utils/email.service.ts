import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  replyToEmail?: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  bcc?: string | string[];
}

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', '127.0.0.1');
    const portValue = this.configService.get<string>('SMTP_PORT', '25');
    const secureValue = this.configService.get<string>('SMTP_SECURE', 'false');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const port = Number.parseInt(portValue, 10);
    const secure = secureValue === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port: Number.isNaN(port) ? 25 : port,
      secure,
      auth: user && pass ? { user, pass } : undefined
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, text, from, bcc, replyToEmail } = options;

    const fromEmail = from || this.configService.get<string>('MAIL_FROM_EMAIL');
    if (!fromEmail) {
      throw new BadRequestException('email.errors.emailConfigurationMissing');
    }

    const toAddresses = Array.isArray(to) ? to : [to];
    const bccAddresses = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;

    try {
      await this.transporter.sendMail({
        from: fromEmail,
        to: toAddresses,
        bcc: bccAddresses,
        replyTo: replyToEmail,
        subject,
        html,
        text
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new BadRequestException('email.errors.failedToSendEmail');
    }
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const subject = 'Bem-vindo ao Salvtec!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Bem-vindo ao Salvtec, ${userName}!</h2>
        <p>Obrigado por se juntar ao Salvtec. Sua conta foi criada com sucesso.</p>
        <p>Agora você pode acessar todos os nossos recursos para gerenciar seu negócio de serviços de forma eficiente.</p>
        <div style="margin: 30px 0;">
          <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:8080')}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Começar
          </a>
        </div>
        <p>Se você tiver alguma dúvida, sinta-se à vontade para entrar em contato com nossa equipe de suporte.</p>
        <p>Atenciosamente,<br>A Equipe Salvtec</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html,
      bcc: 'vitorbertazoli@gmail.com'
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token=${resetToken}`;

    const subject = 'Solicitação de Redefinição de Senha';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Solicitação de Redefinição de Senha</h2>
        <p>Olá ${userName},</p>
        <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para definir uma nova senha:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Redefinir Senha
          </a>
        </div>
        <p>Este link expirará em 1 hora por motivos de segurança.</p>
        <p>Se você não solicitou esta redefinição de senha, ignore este e-mail.</p>
        <p>Atenciosamente,<br>A Equipe Salvtec</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html
    });
  }

  async sendVerificationEmail(to: string, userName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')}/verify-email?token=${verificationToken}`;

    const subject = 'Verifique sua conta no Salvtec';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Verifique sua conta no Salvtec</h2>
        <p>Olá ${userName},</p>
        <p>Obrigado por se registrar no Salvtec! Para ativar sua conta, clique no botão abaixo:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Verificar Conta
          </a>
        </div>
        <p>Este link expirará em 24 horas por motivos de segurança.</p>
        <p>Se você não criou uma conta no Salvtec, ignore este e-mail.</p>
        <p>Atenciosamente,<br>A Equipe Salvtec</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html
    });
  }

  async sendQuoteNotification(to: string, quoteDetails: any): Promise<void> {
    const subject = `Nova Cotação Disponível: ${quoteDetails.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Nova Cotação Disponível</h2>
        <p>Uma nova cotação foi criada para você.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>${quoteDetails.title}</h3>
          <p><strong>Valor Total:</strong> R$ ${quoteDetails.totalValue}</p>
          <p><strong>Válido Até:</strong> ${quoteDetails.validUntil}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:8080')}/quotes/${quoteDetails.id}"
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Ver Cotação
          </a>
        </div>
        <p>Atenciosamente,<br>A Equipe Salvtec</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html
    });
  }
}
