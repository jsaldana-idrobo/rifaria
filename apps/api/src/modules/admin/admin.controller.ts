import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Patch,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePrizeDrawDto } from '../prize-draws/dto/create-prize-draw.dto';
import { ReorderPrizeDrawsDto } from '../prize-draws/dto/reorder-prize-draws.dto';
import { UpdatePrizeDrawDto } from '../prize-draws/dto/update-prize-draw.dto';
import { UpdateRaffleDto } from '../raffles/dto/update-raffle.dto';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin', 'support', 'viewer')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Get('orders')
  @Roles('owner', 'admin', 'support', 'viewer')
  orders(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
    return this.adminService.listOrders(limit);
  }

  @Get('payments')
  @Roles('owner', 'admin', 'support', 'viewer')
  payments(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
    return this.adminService.listPayments(limit);
  }

  @Get('users')
  @Roles('owner', 'admin')
  users(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
    return this.adminService.listUsers(limit);
  }

  @Get('prize-draws')
  @Roles('owner', 'admin', 'support', 'viewer')
  prizeDraws() {
    return this.adminService.listPrizeDraws();
  }

  @Post('prize-draws')
  @Roles('owner', 'admin')
  createPrizeDraw(@Body() dto: CreatePrizeDrawDto) {
    return this.adminService.createPrizeDraw(dto);
  }

  @Patch('prize-draws/:id')
  @Roles('owner', 'admin')
  updatePrizeDraw(@Param('id') id: string, @Body() dto: UpdatePrizeDrawDto) {
    return this.adminService.updatePrizeDraw(id, dto);
  }

  @Post('prize-draws/reorder')
  @Roles('owner', 'admin')
  reorderPrizeDraws(@Body() dto: ReorderPrizeDrawsDto) {
    return this.adminService.reorderPrizeDraws(dto);
  }

  @Post('prize-draws/:id/cancel')
  @Roles('owner', 'admin')
  cancelPrizeDraw(@Param('id') id: string) {
    return this.adminService.cancelPrizeDraw(id);
  }

  @Get('buyers')
  @Roles('owner', 'admin', 'support', 'viewer')
  buyers(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
    return this.adminService.listBuyers(limit);
  }

  @Get('tickets')
  @Roles('owner', 'admin', 'support', 'viewer')
  tickets(
    @Query('search') search?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number
  ) {
    return this.adminService.listTicketInventory(search, limit);
  }

  @Patch('raffles/:id')
  @Roles('owner', 'admin')
  updateRaffle(@Param('id') id: string, @Body() dto: UpdateRaffleDto) {
    return this.adminService.updateRaffle(id, dto);
  }
}
