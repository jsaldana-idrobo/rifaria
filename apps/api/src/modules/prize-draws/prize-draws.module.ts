import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrizeDraw, PrizeDrawSchema } from './schemas/prize-draw.schema';
import { PrizeDrawsService } from './prize-draws.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: PrizeDraw.name, schema: PrizeDrawSchema }])],
  providers: [PrizeDrawsService],
  exports: [PrizeDrawsService, MongooseModule]
})
export class PrizeDrawsModule {}
