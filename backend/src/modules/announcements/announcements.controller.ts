import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

function viewerIsStaff(user: User): boolean {
  return [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(user.role);
}

@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcements: AnnouncementsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getActive(@CurrentUser() user: User) {
    return this.announcements.findActiveForViewer(viewerIsStaff(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('admin')
  getAll() {
    return this.announcements.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: User) {
    const a = await this.announcements.findOne(id);
    if (a.staffOnly && !viewerIsStaff(user)) {
      throw new ForbiddenException('You do not have access to this announcement.');
    }
    return a;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@Body() dto: CreateAnnouncementDto) {
    return this.announcements.create({ ...dto, staffOnly: dto.staffOnly === true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateAnnouncementDto) {
    const patch: CreateAnnouncementDto & { staffOnly?: boolean } = { ...dto };
    if (dto.staffOnly !== undefined) {
      patch.staffOnly = dto.staffOnly === true;
    } else {
      delete (patch as any).staffOnly;
    }
    return this.announcements.update(id, patch);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcements.remove(id);
  }
}
