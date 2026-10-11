import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AccountExistsQueryDto } from './dto/account-exists-query.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('account-exists')
  accountExists(@Query() q: AccountExistsQueryDto) {
    return this.authService.accountExists(q.email);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
