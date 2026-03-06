import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantSetting } from './entities/restaurant-setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { RestaurantSettingRepository } from './repositories/restaurant-setting.repository';
import { SettingsQueryService } from './services/settings-query.service';
import { SettingsCommandService } from './services/settings-command.service';
import { SettingsAuthorizationService } from './services/settings-authorization.service';
import { SettingsValueNormalizerService } from './services/settings-value-normalizer.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RestaurantSetting])],
  providers: [
    SettingsService,
    RestaurantSettingRepository,
    SettingsQueryService,
    SettingsCommandService,
    SettingsAuthorizationService,
    SettingsValueNormalizerService,
  ],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
