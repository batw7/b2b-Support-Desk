import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketReply } from './entities/ticket-reply.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketLog } from './entities/ticket-log.entity';
import { TicketPriority } from './entities/ticket-priority.entity';
import { TicketRequestType } from './entities/ticket-request-type.entity';
import { User } from '../users/entities/user.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketReply,
      TicketAttachment,
      TicketLog,
      TicketPriority,
      TicketRequestType,
      User,
    ]),
    ProductsModule,
  ],
  providers: [TicketsService],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
