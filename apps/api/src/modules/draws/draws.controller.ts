import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PostponeRaffleDto } from './dto/postpone-raffle.dto';
import { SettleDrawDto } from './dto/settle-draw.dto';
import { DrawsService } from './draws.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class DrawsController {
  constructor(private readonly drawsService: DrawsService) {}

  @Post('raffles/:id/postpone')
  @Roles('owner', 'admin')
  postpone(@Param('id') raffleId: string, @Body() dto: PostponeRaffleDto) {
    return this.drawsService.postponeRaffle(raffleId, dto);
  }

  @Post('prize-draws/:prizeDrawId/settle')
  @Roles('owner', 'admin')
  settle(@Param('prizeDrawId') prizeDrawId: string, @Body() dto: SettleDrawDto) {
    return this.drawsService.settleDraw(prizeDrawId, dto);
  }
}
