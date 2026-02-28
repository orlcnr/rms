import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Debug')
@Controller('debug')
export class DebugController {
  @Public()
  @Get('sentry-test')
  @ApiOperation({ summary: 'GlitchTip test - sadece development' })
  @ApiResponse({ status: 500, description: 'Test hatası' })
  async sentryTest() {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Development only');
    }
    throw new Error('🧪 GlitchTip Test Hatası');
  }
}
