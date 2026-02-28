import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantSetting } from './entities/restaurant-setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RestaurantSetting])],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
