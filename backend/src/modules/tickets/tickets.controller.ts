import {
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { TicketStatus } from '../../common/enums/ticket-status.enum';

const ticketFiles = FilesInterceptor('files', 10, {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTicketDto) {
    return this.tickets.create(user.id, dto);
  }

  @Get('priorities')
  priorities() {
    return this.tickets.getPriorities();
  }

  @Get('request-types')
  requestTypes() {
    return this.tickets.getRequestTypes();
  }

  @Get('my')
  myTickets(@CurrentUser() user: User, @Query('status') status?: TicketStatus) {
    return this.tickets.findMyTickets(user.id, status);
  }

  @Get('stats')
  stats() {
    return this.tickets.getStats();
  }

  @Get('open-by-priority')
  openByPriority(@CurrentUser() user: User) {
    return this.tickets.getOpenTicketCountsByPriority(user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('admin/ticket-logs')
  ticketLogs(@Query('limit') limit?: number) {
    return this.tickets.getRecentTicketLogs(limit ? parseInt(String(limit), 10) : 100);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('owner/assignable-support')
  assignableSupport() {
    return this.tickets.findAssignableSupportUsers();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Get('admin/support-ranking')
  supportRanking() {
    return this.tickets.getSupportRanking();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Get('admin/list')
  listForStaff(
    @Query('status') status?: TicketStatus,
    @Query('assignedTo') assignedToId?: string,
  ) {
    return this.tickets.findAllForStaff(status, assignedToId);
  }

  @Post(':id/attachments')
  @UseInterceptors(ticketFiles)
  uploadTicketFiles(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.tickets.addAttachmentsToTicket(id, user, files || []);
  }

  @Post(':id/replies/:replyId/attachments')
  @UseInterceptors(ticketFiles)
  uploadReplyFiles(
    @Param('id') id: string,
    @Param('replyId') replyId: string,
    @CurrentUser() user: User,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.tickets.addAttachmentsToReply(id, replyId, user, files || []);
  }

  @Get(':id/attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { filePath, originalName, mimeType } = await this.tickets.resolveAttachmentFile(
      id,
      attachmentId,
      user,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    createReadStream(filePath).pipe(res);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tickets.findOne(id, user);
  }

  @Post(':id/replies')
  addReply(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateReplyDto,
  ) {
    return this.tickets.addReply(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: TicketStatus },
    @CurrentUser() user: User,
  ) {
    return this.tickets.updateStatus(id, body.status, user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @Put(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() body: { assignedToId: string | null },
    @CurrentUser() user: User,
  ) {
    return this.tickets.assign(id, body.assignedToId ?? null, user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN)
  @Post(':id/request-close')
  requestClose(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tickets.requestClose(id, user);
  }

  @Post(':id/confirm-close')
  confirmClose(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tickets.confirmClose(id, user);
  }

  @Post(':id/cancel-close-request')
  cancelCloseRequest(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { reason: string },
  ) {
    return this.tickets.cancelCloseRequest(id, user, body?.reason ?? '');
  }

  @Patch(':id/replies/:replyId')
  updateReply(
    @Param('id') id: string,
    @Param('replyId') replyId: string,
    @Body() body: { content: string },
    @CurrentUser() user: User,
  ) {
    return this.tickets.updateReply(id, replyId, user, body.content);
  }

  @Delete(':id/replies/:replyId')
  deleteReply(
    @Param('id') id: string,
    @Param('replyId') replyId: string,
    @CurrentUser() user: User,
  ) {
    return this.tickets.deleteReply(id, replyId, user);
  }
}
