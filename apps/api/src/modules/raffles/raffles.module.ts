import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RafflesController } from './raffles.controller';
import { RafflesService } from './raffles.service';
import { Raffle, RaffleSchema } from './schemas/raffle.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Raffle.name, schema: RaffleSchema }])],
  controllers: [RafflesController],
  providers: [RafflesService],
  exports: [RafflesService, MongooseModule]
})
export class RafflesModule {}
