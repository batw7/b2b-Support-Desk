import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReplyDto {
  @IsString()
  content: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return false;
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    return false;
  })
  @IsBoolean()
  isInternal?: boolean;
}
