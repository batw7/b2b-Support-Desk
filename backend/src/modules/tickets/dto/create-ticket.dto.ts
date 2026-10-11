import { IsString, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

const emptyToUndef = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : value;

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsOptional()
  @Transform(emptyToUndef)
  @IsString()
  reason?: string;

  @IsOptional()
  @Transform(emptyToUndef)
  @IsUUID()
  priorityId?: string;

  @IsOptional()
  @Transform(emptyToUndef)
  @IsUUID()
  requestTypeId?: string;

  @IsUUID()
  productId: string;

  @IsOptional()
  @Transform(emptyToUndef)
  @IsString()
  module?: string;

  @IsOptional()
  @Transform(emptyToUndef)
  @IsString()
  customerCode?: string;
}
