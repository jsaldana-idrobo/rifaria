import { Controller, Get, Param } from '@nestjs/common';
import { RafflesService } from './raffles.service';

@Controller('public/raffle')
export class RafflesController {
  constructor(private readonly rafflesService: RafflesService) {}

  @Get('active')
  getActive() {
    return this.rafflesService.getActivePublicRaffle();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.rafflesService.getRaffleByIdOrThrow(id);
  }
}
