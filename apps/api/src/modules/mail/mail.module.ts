import { Global, Module } from "@nestjs/common";

import { MailService } from "./application/mail.service";
import { SmtpMailProvider } from "./infrastructure/smtp-mail.provider";

@Global()
@Module({
  providers: [SmtpMailProvider, MailService],
  exports: [MailService],
})
export class MailModule {}
