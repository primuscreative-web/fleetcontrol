import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";

import type { MailMessage, MailProvider } from "../application/mail-message";

@Injectable()
export class SmtpMailProvider implements MailProvider {
  private readonly transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");

    if (!host) {
      return;
    }

    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASSWORD");

    this.transporter = createTransport({
      host,
      port: this.configService.get<number>("SMTP_PORT", 587),
      secure: this.configService.get<boolean>("SMTP_SECURE", false),
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException("SMTP provider is not configured.");
    }

    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>("MAIL_FROM"),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
