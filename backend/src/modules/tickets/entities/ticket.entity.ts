import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TicketReply } from './ticket-reply.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketLog } from './ticket-log.entity';
import { TicketPriority } from './ticket-priority.entity';
import { TicketRequestType } from './ticket-request-type.entity';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';
import { Product } from '../../products/entities/product.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 32, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'uuid', nullable: true })
  priorityId: string | null;

  @ManyToOne(() => TicketPriority, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'priorityId' })
  priority: TicketPriority | null;

  @Column({ type: 'uuid', nullable: true })
  requestTypeId: string | null;

  @ManyToOne(() => TicketRequestType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requestTypeId' })
  requestType: TicketRequestType | null;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ type: 'timestamp', nullable: true })
  closeRequestedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closeRequestedById: string | null;

  @Column({ type: 'text', nullable: true })
  closeRequestCancelReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  catalogProduct: Product | null;

  @Column({ nullable: true })
  product: string;

  @Column({ nullable: true })
  productGroup: string;

  @Column({ nullable: true })
  version: string;

  @Column({ nullable: true })
  module: string;

  @Column({ nullable: true })
  customerCode: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  firmResponsible: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requestingUser: string | null;

  @OneToMany(() => TicketReply, (reply) => reply.ticket, { cascade: true })
  replies: TicketReply[];

  @OneToMany(() => TicketAttachment, (a) => a.ticket)
  attachments: TicketAttachment[];

  @OneToMany(() => TicketLog, (log) => log.ticket, { cascade: true })
  logs: TicketLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
