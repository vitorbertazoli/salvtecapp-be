import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  bcc?: string | string[];
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
    const { to, subject, html, text, from, bcc } = options;

    const fromEmail = from || this.configService.get<string>('AWS_SES_FROM_EMAIL');
    if (!fromEmail) {
      throw new Error('From email not configured. Set AWS_SES_FROM_EMAIL environment variable.');
    }

    const toAddresses = Array.isArray(to) ? to : [to];
    const bccAddresses = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;

    const emailParams: SendEmailCommandInput = {
      Source: fromEmail,
      Destination: {
        ToAddresses: toAddresses,
        BccAddresses: bccAddresses
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
