import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ticket_priorities')
export class TicketPriority {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 64 })
  label: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
