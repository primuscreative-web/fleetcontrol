import { Injectable } from "@nestjs/common";

import type { MailMessage } from "./mail-message";
import { SmtpMailProvider } from "../infrastructure/smtp-mail.provider";

@Injectable()
export class MailService {
  constructor(private readonly provider: SmtpMailProvider) {}

  send(message: MailMessage): Promise<void> {
    return this.provider.send(message);
  }
}
