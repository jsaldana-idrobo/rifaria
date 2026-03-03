import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Patch,
  Param,
  Query,
  Body,
  UseGuards
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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

  @Patch('raffles/:id')
  @Roles('owner', 'admin')
  updateRaffle(@Param('id') id: string, @Body() dto: UpdateRaffleDto) {
    return this.adminService.updateRaffle(id, dto);
  }
}
