import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../../common/enums/role.enum';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { TicketReply } from '../../tickets/entities/ticket-reply.entity';
import { Firm } from '../../firms/entities/firm.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 72 })
  @Exclude()
  password: string;

  @Column({ type: 'varchar', length: 200 })
  fullName: string;

  @Column({ type: 'varchar', length: 32, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  firmId: string | null;

  @ManyToOne(() => Firm, (f) => f.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'firmId' })
  firm: Firm | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => TicketReply, (reply) => reply.user)
  ticketReplies: TicketReply[];
}
