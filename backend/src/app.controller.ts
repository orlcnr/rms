import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { MainSeeder } from './database/seeds/main.seeder';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mainSeeder: MainSeeder,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Simple health check endpoint for container health probes
  @Public()
  @Get('health')
  health(): object {
    return { status: 'ok' };
  }

  @Public()
  @Get('system/status')
  getStatus(): object {
    return {
      status: 'ok',
      serverTime: new Date().toISOString(),
    };
  }

  @Public()
  @Post('seed')
  async seed() {
    await this.mainSeeder.seed();
    return { message: 'Seeding completed' };
  }
}
