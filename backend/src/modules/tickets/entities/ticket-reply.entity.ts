import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ticket_replies')
export class TicketReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.replies, { onDelete: 'CASCADE' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.ticketReplies, { onDelete: 'CASCADE' })
  user: User;

  @Column({ default: false })
  isStaffReply: boolean;

  @Column({ default: false })
  isInternal: boolean;

  @OneToMany(() => TicketAttachment, (a) => a.reply)
  attachments: TicketAttachment[];

  @CreateDateColumn()
  createdAt: Date;
}
