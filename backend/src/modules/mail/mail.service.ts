import { Injectable, Logger } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MailService {
    private client: ClientProxy
    private readonly logger = new Logger(MailService.name)

    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService
    ) {
        this.client = ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [
                    this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
                ],
                queue: this.configService.get<string>('RABBITMQ_MAIL_QUEUE') || 'mail_queue',
                queueOptions: {
                    durable: true,
                },
            },
        } as any)
    }

    /**
     * Emits an email sending task to the queue
     */
    async sendWelcomeEmail(to: string, firstName: string, tempPassword: string) {
        this.logger.log(`[MAIL SERVICE] Queuing welcome email for: ${to}`)
        this.client.emit('send_welcome_email', { to, firstName, tempPassword })
    }

    /**
     * Emits a password update email sending task to the queue
     */
    async sendPasswordUpdateEmail(to: string, firstName: string, newPassword: string) {
        this.logger.log(`[MAIL SERVICE] Queuing password update email for: ${to}`)
        this.client.emit('send_password_update_email', { to, firstName, newPassword })
    }

    /**
     * Performs the actual email sending logic (consumed by MailConsumer)
     */
    async sendActualEmail(to: string, firstName: string, tempPassword: string) {
        try {
            await this.mailerService.sendMail({
                to,
                subject: 'Welcome to RMS - Your Account Credentials',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505; color: #ffffff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                        <h1 style="color: #a855f7; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 24px;">Welcome to RMS, ${firstName}!</h1>
                        <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                            Your restaurant entity has been successfully provisioned. Use the following credentials to access the management panel.
                        </p>
                        
                        <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                            <div style="margin-bottom: 16px;">
                                <span style="display: block; font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Email</span>
                                <span style="font-family: monospace; font-size: 18px; color: #ffffff;">${to}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Temporary Password</span>
                                <span style="font-family: monospace; font-size: 18px; color: #a855f7; font-weight: bold;">${tempPassword}</span>
                            </div>
                        </div>

                        <p style="color: #ef4444; font-size: 14px; font-weight: bold; margin-bottom: 24px;">
                            Important: Please change your password immediately after your first login.
                        </p>

                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-top: 32px;">
                            <p style="color: #4b5563; font-size: 12px;">
                                RMS Infrastructure - Automated Security Protocol
                            </p>
                        </div>
                    </div>
                `,
            })
        } catch (error) {
            this.logger.error(`[MAIL SERVICE] Failed to send actual email to ${to}:`, error)
            throw error // Consumer will handle the retry/log
        }
    }

    /**
     * Performs the actual password update email sending logic
     */
    async sendActualPasswordUpdateEmail(to: string, firstName: string, newPassword: string) {
        try {
            await this.mailerService.sendMail({
                to,
                subject: 'RMS - Password Updated',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505; color: #ffffff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                        <h1 style="color: #a855f7; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 24px;">Password Updated, ${firstName}</h1>
                        <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                            Your account password has been updated by a system administrator. Use the following new credentials to access the management panel.
                        </p>
                        
                        <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                            <div style="margin-bottom: 16px;">
                                <span style="display: block; font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Email</span>
                                <span style="font-family: monospace; font-size: 18px; color: #ffffff;">${to}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">New Password</span>
                                <span style="font-family: monospace; font-size: 18px; color: #a855f7; font-weight: bold;">${newPassword}</span>
                            </div>
                        </div>

                        <p style="color: #ef4444; font-size: 14px; font-weight: bold; margin-bottom: 24px;">
                            Security Note: If you did not request this change, please contact your system administrator immediately.
                        </p>

                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-top: 32px;">
                            <p style="color: #4b5563; font-size: 12px;">
                                RMS Infrastructure - Automated Security Protocol
                            </p>
                        </div>
                    </div>
                `,
            })
        } catch (error) {
            this.logger.error(`[MAIL SERVICE] Failed to send actual password update email to ${to}:`, error)
            throw error
        }
    }
}
