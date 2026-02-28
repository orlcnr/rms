import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MailService } from './mail.service';

@Controller()
export class MailConsumer {
  private readonly logger = new Logger(MailConsumer.name);

  constructor(private readonly mailService: MailService) {}

  @EventPattern('send_welcome_email')
  async handleWelcomeEmail(
    @Payload() data: { to: string; firstName: string; tempPassword: string },
  ) {
    this.logger.log(`[MAIL CONSUMER] Processing welcome email for: ${data.to}`);
    try {
      await this.mailService.sendActualEmail(
        data.to,
        data.firstName,
        data.tempPassword,
      );
      this.logger.log(
        `[MAIL CONSUMER] Successfully sent welcome email to: ${data.to}`,
      );
    } catch (error) {
      this.logger.error(
        `[MAIL CONSUMER] Error processing email for ${data.to}:`,
        error,
      );
    }
  }

  @EventPattern('send_password_update_email')
  async handlePasswordUpdateEmail(
    @Payload() data: { to: string; firstName: string; newPassword: string },
  ) {
    this.logger.log(
      `[MAIL CONSUMER] Processing password update email for: ${data.to}`,
    );
    try {
      await this.mailService.sendActualPasswordUpdateEmail(
        data.to,
        data.firstName,
        data.newPassword,
      );
      this.logger.log(
        `[MAIL CONSUMER] Successfully sent password update email to: ${data.to}`,
      );
    } catch (error) {
      this.logger.error(
        `[MAIL CONSUMER] Error processing password update email for ${data.to}:`,
        error,
      );
    }
  }
}
