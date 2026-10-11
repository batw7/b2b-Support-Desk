import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FirmsService } from './firms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@Controller('firms')
export class FirmsController {
  constructor(private readonly firms: FirmsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Get()
  list() {
    return this.firms.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@Body() body: { name: string }) {
    return this.firms.create(body.name || '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.firms.update(id, body.name || '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.firms.remove(id);
    return { ok: true };
  }
}
