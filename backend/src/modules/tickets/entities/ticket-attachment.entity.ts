import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketReply } from './ticket-reply.entity';

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column({ type: 'uuid', nullable: true })
  ticketId: string | null;

  @ManyToOne(() => Ticket, (t) => t.attachments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column({ type: 'uuid', nullable: true })
  replyId: string | null;

  @ManyToOne(() => TicketReply, (r) => r.attachments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'replyId' })
  reply: TicketReply | null;

  @CreateDateColumn()
  createdAt: Date;
}
