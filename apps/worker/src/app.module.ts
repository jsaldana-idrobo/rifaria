import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { loadEnv } from './config/env';
import { QUEUE_NAMES } from './jobs/queue-names';
import { NotificationsProcessor } from './processors/notifications.processor';
import { TicketsProcessor } from './processors/tickets.processor';
import { Order, OrderSchema } from './schemas/order.schema';
import { Raffle, RaffleSchema } from './schemas/raffle.schema';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { EmailService } from './services/email.service';
import { WorkerBootstrapService } from './worker-bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (source) => loadEnv(source as NodeJS.ProcessEnv)
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/rifaria')
      })
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Raffle.name, schema: RaffleSchema },
      { name: Ticket.name, schema: TicketSchema }
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: (() => {
          const password = configService.get<string>('REDIS_PASSWORD');

          return {
            host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
            port: configService.get<number>('REDIS_PORT', 6379),
            ...(password ? { password } : {})
          };
        })()
      })
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.NOTIFICATIONS
      },
      {
        name: QUEUE_NAMES.TICKETS
      }
    )
  ],
  providers: [EmailService, NotificationsProcessor, TicketsProcessor, WorkerBootstrapService]
})
export class AppModule {}
