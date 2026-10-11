import { IsString, MinLength, IsOptional, ValidateBy, ValidationOptions } from 'class-validator';
import { Transform } from 'class-transformer';

export function IsEmailOrAdmin(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isEmailOrAdmin',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return false;
          const t = value.trim().toLowerCase();
          if (t === 'admin') return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
        },
        defaultMessage: () => 'Enter a valid email or admin.',
      },
    },
    validationOptions,
  );
}

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsEmailOrAdmin()
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password: string;

  @IsOptional()
  @IsString()
  passwordConfirm?: string;
}
