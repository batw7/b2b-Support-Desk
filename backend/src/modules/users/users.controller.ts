import { Get, Body, Param, Put, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

function toPublicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    firmId: u.firmId ?? null,
    firmName: u.firm?.name ?? null,
  };
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return toPublicUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@CurrentUser() user: User, @Body() body: { fullName?: string; email?: string }) {
    const u = await this.usersService.update(user.id, body);
    return toPublicUser(u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('staff')
  async staffList() {
    const users = await this.usersService.findStaff();
    return users.map(toPublicUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('assign-role')
  async assignRole(
    @Body() body: { email: string; role: UserRole },
    @CurrentUser() currentUser: User,
  ) {
    const u = await this.usersService.assignRoleByEmail(body.email, body.role, currentUser);
    return toPublicUser(u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Get()
  async list() {
    const users = await this.usersService.findAll();
    return users.map(toPublicUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Get(':id')
  async get(@Param('id') id: string) {
    const u = await this.usersService.findById(id);
    if (!u) throw new NotFoundException('User not found.');
    return toPublicUser(u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Put(':id/role')
  async setRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @CurrentUser() user: User,
  ) {
    const u = await this.usersService.setRole(user.id, id, body.role);
    return toPublicUser(u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Put(':id/firm')
  async setFirm(
    @Param('id') id: string,
    @Body() body: { firmId: string | null },
    @CurrentUser() user: User,
  ) {
    const u = await this.usersService.setFirm(user, id, body.firmId ?? null);
    return toPublicUser(u);
  }
}
