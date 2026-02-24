import { Module } from '@nestjs/common'
import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'
import { MailService } from './mail.service'
import { MailConsumer } from './mail.consumer'

@Module({
    imports: [
        MailerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                transport: {
                    host: config.get('MAIL_HOST'),
                    port: config.get('MAIL_PORT'),
                    secure: false,
                    auth: config.get('MAIL_USER') ? {
                        user: config.get('MAIL_USER'),
                        pass: config.get('MAIL_PASS'),
                    } : undefined,
                },
                defaults: {
                    from: `"RMS System" <${config.get('MAIL_FROM')}>`,
                },
            }),
        }),
    ],
    providers: [MailService],
    controllers: [MailConsumer],
    exports: [MailService],
})
export class MailModule { }
