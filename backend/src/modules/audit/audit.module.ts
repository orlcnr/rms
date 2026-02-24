import { Module, Global } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditConsumer } from './audit.consumer';
import { AuditSearchService } from './audit-search.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_NODE'),
        // Sunucu v7 ise v8 istemcisinin v7 gibi davranmasını sağlar
        enableCompatibilityMode: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuditService,
    AuditSearchService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [AuditConsumer, AuditController],
  exports: [AuditService],
})
export class AuditModule {}
