import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ticket_request_types')
export class TicketRequestType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  label: string;
}
