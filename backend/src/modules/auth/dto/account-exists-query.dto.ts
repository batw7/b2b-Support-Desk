import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsEmailOrAdmin } from './login.dto';

export class AccountExistsQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsEmailOrAdmin()
  email: string;
}
