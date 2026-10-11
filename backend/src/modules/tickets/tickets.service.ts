import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { Ticket } from './entities/ticket.entity';
import { TicketReply } from './entities/ticket-reply.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { TicketLog } from './entities/ticket-log.entity';
import { TicketPriority } from './entities/ticket-priority.entity';
import { TicketRequestType } from './entities/ticket-request-type.entity';
import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { UserRole } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class TicketsService implements OnModuleInit {
  private uploadRel: string;

  constructor(
    @InjectRepository(Ticket) private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketReply) private replyRepo: Repository<TicketReply>,
    @InjectRepository(TicketAttachment) private attachmentRepo: Repository<TicketAttachment>,
    @InjectRepository(TicketLog) private logRepo: Repository<TicketLog>,
    @InjectRepository(TicketPriority) private priorityRepo: Repository<TicketPriority>,
    @InjectRepository(TicketRequestType) private requestTypeRepo: Repository<TicketRequestType>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private productsService: ProductsService,
    private config: ConfigService,
  ) {
    this.uploadRel = this.config.get<string>('UPLOAD_PATH') || 'uploads';
  }

  async onModuleInit() {
    const priCount = await this.priorityRepo.count();
    if (priCount === 0) {
      await this.priorityRepo.save([
        { code: 'S1', label: 'Critical', sortOrder: 1 },
        { code: 'S2', label: 'High', sortOrder: 2 },
        { code: 'S3', label: 'Medium', sortOrder: 3 },
        { code: 'S4', label: 'Low', sortOrder: 4 },
        { code: 'S5', label: 'Lowest', sortOrder: 5 },
      ]);
    }
    const reqCount = await this.requestTypeRepo.count();
    if (reqCount === 0) {
      await this.requestTypeRepo.save([
        { code: 'SORUN', label: 'Issue report' },
        { code: 'ISTEK', label: 'Feature request' },
      ]);
    }
  }

  async getPriorities(): Promise<TicketPriority[]> {
    return this.priorityRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async getRequestTypes(): Promise<TicketRequestType[]> {
    return this.requestTypeRepo.find({ order: { code: 'ASC' } });
  }

  async create(userId: string, dto: CreateTicketDto) {
    const creator = await this.userRepo.findOne({ where: { id: userId }, relations: ['firm'] });
    if (!creator) throw new NotFoundException('User not found.');
    if (!dto.productId) throw new BadRequestException('Product selection is required.');
    const prod = await this.productsService.findById(dto.productId);
    if (!prod) throw new NotFoundException('Product not found.');

    const saved = await this.ticketRepo.save(
      {
        userId,
        subject: dto.subject,
        description: dto.description,
        reason: dto.reason ?? null,
        priorityId: dto.priorityId ?? null,
        requestTypeId: dto.requestTypeId ?? null,
        productId: dto.productId,
        module: dto.module ?? null,
        customerCode: dto.customerCode ?? null,
        customerName: creator.fullName,
        firmResponsible: creator.firm?.name ?? null,
      } as Ticket,
    );
    await this.logRepo.save(this.logRepo.create({ ticketId: saved.id, action: 'opened', userId }));
    return saved;
  }

  private async persistFiles(
    ticketId: string,
    replyId: string | null,
    files: Express.Multer.File[],
  ) {
    if (!files?.length) return;
    const dir = join(process.cwd(), this.uploadRel, 'tickets', ticketId);
    await mkdir(dir, { recursive: true });
    for (const file of files) {
      if (!file?.buffer?.length) continue;
      const ext = extname(file.originalname || '') || '';
      const stored = `${randomUUID()}${ext}`;
      await writeFile(join(dir, stored), file.buffer);
      await this.attachmentRepo.save(
        this.attachmentRepo.create({
          ticketId,
          replyId,
          filename: stored,
          originalName: (file.originalname || 'file').slice(0, 255),
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
        }),
      );
    }
  }

  async addAttachmentsToTicket(ticketId: string, user: User, files: Express.Multer.File[]) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const isOwner = ticket.userId === user.id;
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(user.role);
    if (!isOwner && !isStaff) throw new ForbiddenException('You cannot upload files.');
    await this.persistFiles(ticketId, null, files);
    return { ok: true };
  }

  async addAttachmentsToReply(ticketId: string, replyId: string, user: User, files: Express.Multer.File[]) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const reply = await this.replyRepo.findOne({ where: { id: replyId, ticketId } });
    if (!reply) throw new NotFoundException('Message not found.');
    const isOwner = ticket.userId === user.id;
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(user.role);
    if (!isOwner && !isStaff) throw new ForbiddenException('You cannot upload files.');
    if (reply.userId !== user.id) throw new ForbiddenException('You can only attach files to your own messages.');
    await this.persistFiles(ticketId, replyId, files);
    return { ok: true };
  }

  async findMyTickets(userId: string, status?: TicketStatus) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('user.firm', 'userFirm')
      .leftJoinAndSelect('t.catalogProduct', 'catalogProduct')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.priority', 'priority')
      .leftJoinAndSelect('t.requestType', 'requestType')
      .loadRelationCountAndMap('t.replyCount', 't.replies')
      .where('t.userId = :userId', { userId })
      .orderBy('t.updatedAt', 'DESC');
    if (status) qb.andWhere('t.status = :status', { status });
    return qb.getMany();
  }

  async findOne(id: string, user: User) {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: [
        'user',
        'user.firm',
        'catalogProduct',
        'replies',
        'replies.user',
        'replies.attachments',
        'assignedTo',
        'priority',
        'requestType',
        'attachments',
      ],
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const isOwner = ticket.userId === user.id;
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(user.role);
    if (!isOwner && !isStaff) throw new ForbiddenException('You do not have access to this ticket.');
    if (!isStaff && ticket.replies) {
      ticket.replies = ticket.replies.filter((r) => !(r as any).isInternal);
    }
    if (ticket.attachments?.length) {
      ticket.attachments = ticket.attachments
        .filter((a) => !a.replyId)
        .sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
    }
    if (ticket.replies) {
      for (const r of ticket.replies) {
        if (r.attachments?.length) {
          r.attachments.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        }
      }
    }
    return ticket;
  }

  async addReply(ticketId: string, user: User, dto: CreateReplyDto) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const isOwner = ticket.userId === user.id;
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(user.role);
    if (!isOwner && !isStaff) throw new ForbiddenException('Unauthorized.');
    const reply = this.replyRepo.create({
      ticketId,
      userId: user.id,
      content: dto.content,
      isStaffReply: isStaff,
      isInternal: isStaff && dto.isInternal === true,
    });
    const saved = await this.replyRepo.save(reply);
    if (isStaff) {
      ticket.status = TicketStatus.ANSWERED;
      await this.ticketRepo.save(ticket);
    }
    return saved;
  }

  async resolveAttachmentFile(
    ticketId: string,
    attachmentId: string,
    user: User,
  ): Promise<{ filePath: string; originalName: string; mimeType: string }> {
    const att = await this.attachmentRepo.findOne({ where: { id: attachmentId } });
    if (!att || att.ticketId !== ticketId) throw new NotFoundException('Attachment not found.');
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const isOwner = ticket.userId === user.id;
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(user.role);
    if (!isOwner && !isStaff) throw new ForbiddenException('You do not have access to this file.');
    if (!isStaff && att.replyId) {
      const reply = await this.replyRepo.findOne({ where: { id: att.replyId } });
      if (reply?.isInternal) throw new ForbiddenException('You do not have access to this file.');
    }
    const filePath = join(process.cwd(), this.uploadRel, 'tickets', ticketId, att.filename);
    if (!existsSync(filePath)) throw new NotFoundException('File not found.');
    return { filePath, originalName: att.originalName, mimeType: att.mimeType };
  }

  async findAllForStaff(status?: TicketStatus, assignedToId?: string) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('user.firm', 'userFirm')
      .leftJoinAndSelect('t.catalogProduct', 'catalogProduct')
      .leftJoinAndSelect('t.assignedTo', 'assignedTo')
      .leftJoinAndSelect('t.priority', 'priority')
      .leftJoinAndSelect('t.requestType', 'requestType')
      .loadRelationCountAndMap('t.replyCount', 't.replies')
      .orderBy('t.updatedAt', 'DESC');
    if (status) qb.andWhere('t.status = :status', { status });
    if (assignedToId) qb.andWhere('t.assignedToId = :aid', { aid: assignedToId });
    return qb.getMany();
  }

  async updateStatus(id: string, status: TicketStatus, staffUser: User) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const prev = ticket.status;
    ticket.status = status;
    const saved = await this.ticketRepo.save(ticket);
    await this.logRepo.save(this.logRepo.create({
      ticketId: id,
      action: status === TicketStatus.CLOSED ? 'closed' : 'status_changed',
      details: `${prev} -> ${status}`,
      userId: staffUser.id,
    }));
    return saved;
  }

  async findAssignableSupportUsers() {
    return this.userRepo.find({
      where: { role: In([UserRole.ADMIN, UserRole.SYSTEM_SUPPORT]) },
      select: ['id', 'fullName', 'email', 'role'],
      order: { fullName: 'ASC' },
    });
  }

  async assign(id: string, assignedToId: string | null, actingUser: User) {
    if (actingUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Ticket assignment can only be performed by Owner.');
    }
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (assignedToId) {
      const target = await this.userRepo.findOne({ where: { id: assignedToId } });
      if (!target) throw new NotFoundException('User to assign not found.');
      if (![UserRole.ADMIN, UserRole.SYSTEM_SUPPORT].includes(target.role)) {
        throw new BadRequestException('Can only be assigned to support team members.');
      }
    }
    ticket.assignedToId = assignedToId;
    if (ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.ANSWERED) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    const saved = await this.ticketRepo.save(ticket);
    await this.logRepo.save(
      this.logRepo.create({
        ticketId: id,
        action: assignedToId ? 'assigned' : 'unassigned',
        details: assignedToId ? `Owner assigned: ${assignedToId}` : 'Assignment removed',
        userId: actingUser.id,
      }),
    );
    return saved;
  }

  async requestClose(id: string, staffUser: User) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(staffUser.role);
    if (!isStaff) throw new ForbiddenException('Only the support team can send a ticket close request.');
    if (ticket.status === TicketStatus.CLOSED) throw new ForbiddenException('Ticket is already closed.');
    ticket.closeRequestedAt = new Date();
    ticket.closeRequestedById = staffUser.id;
    ticket.closeRequestCancelReason = null;
    await this.ticketRepo.save(ticket);
    await this.addSystemReply(id, staffUser.id, 'Close request sent. Awaiting company approval.');
    const updated = await this.ticketRepo.findOne({ where: { id }, relations: ['user', 'replies', 'replies.user', 'assignedTo'] });
    return updated ?? ticket;
  }

  async confirmClose(id: string, user: User) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (ticket.userId !== user.id) throw new ForbiddenException('Only the company that opened the ticket can confirm closure.');
    if (!ticket.closeRequestedAt) throw new ForbiddenException('No close request found.');
    await this.addSystemReply(id, user.id, 'The company closed the ticket.');
    ticket.status = TicketStatus.CLOSED;
    ticket.closeRequestedAt = null;
    ticket.closeRequestedById = null;
    const saved = await this.ticketRepo.save(ticket);
    await this.logRepo.save(this.logRepo.create({
      ticketId: id,
      action: 'closed',
      details: 'Closed with company approval',
      userId: user.id,
    }));
    return saved;
  }

  async cancelCloseRequest(id: string, user: User, reason: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (!ticket.closeRequestedAt) {
      throw new BadRequestException('No pending close request.');
    }
    if (ticket.userId !== user.id) {
      throw new ForbiddenException('Only the company user who opened the ticket can cancel the close request.');
    }
    const r = (reason || '').trim();
    if (r.length < 8) {
      throw new BadRequestException('Cancellation reason must be at least 8 characters.');
    }
    ticket.closeRequestedAt = null;
    ticket.closeRequestedById = null;
    ticket.closeRequestCancelReason = r.slice(0, 4000);
    await this.ticketRepo.save(ticket);
    await this.replyRepo.save(
      this.replyRepo.create({
        ticketId: id,
        userId: user.id,
        content:
          'Close request cancelled. Reason: ' +
          ticket.closeRequestCancelReason +
          '\n\nThe support team will review the ticket and continue.',
        isStaffReply: false,
        isInternal: false,
      }),
    );
    await this.logRepo.save(
      this.logRepo.create({
        ticketId: id,
        action: 'close_request_cancelled',
        details: 'Company cancelled the close request',
        userId: user.id,
      }),
    );
    return this.ticketRepo.findOne({
      where: { id },
      relations: ['user', 'replies', 'replies.user', 'assignedTo', 'priority', 'requestType', 'catalogProduct'],
    });
  }

  private async addSystemReply(ticketId: string, userId: string, content: string) {
    const reply = this.replyRepo.create({
      ticketId,
      userId,
      content,
      isStaffReply: true,
      isInternal: true,
    });
    return this.replyRepo.save(reply);
  }

  async updateReply(ticketId: string, replyId: string, user: User, content: string) {
    const reply = await this.replyRepo.findOne({ where: { id: replyId, ticketId } });
    if (!reply) throw new NotFoundException('Message not found.');
    if (reply.userId !== user.id) throw new ForbiddenException('You can only edit your own messages.');
    reply.content = content;
    return this.replyRepo.save(reply);
  }

  async deleteReply(ticketId: string, replyId: string, user: User) {
    const reply = await this.replyRepo.findOne({ where: { id: replyId, ticketId } });
    if (!reply) throw new NotFoundException('Message not found.');
    if (reply.userId !== user.id) throw new ForbiddenException('You can only delete your own messages.');
    await this.replyRepo.remove(reply);
    return { deleted: true };
  }

  async getStats() {
    const [active, closed, pending] = await Promise.all([
      this.ticketRepo.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.ticketRepo.count({ where: { status: TicketStatus.CLOSED } }),
      this.ticketRepo.count({ where: { status: TicketStatus.OPEN } }),
    ]);

    const openStatuses = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ANSWERED];

    const priorityCounts = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.priority', 'p')
      .select('COALESCE(p.code, \'NONE\')', 'code')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.status IN (:...open)', { open: openStatuses })
      .groupBy('p.code')
      .getRawMany();

    const requestTypeCounts = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.requestType', 'rt')
      .select('COALESCE(rt.code, \'NONE\')', 'code')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.status IN (:...open)', { open: openStatuses })
      .groupBy('rt.code')
      .getRawMany();

    const byPriority: Record<string, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, NONE: 0 };
    priorityCounts.forEach((r) => {
      const code = r.code ?? 'NONE';
      byPriority[code] = (byPriority[code] ?? 0) + (parseInt(r.cnt, 10) || 0);
    });

    const byRequestType: Record<string, number> = {};
    requestTypeCounts.forEach((r) => {
      byRequestType[r.code ?? 'NONE'] = parseInt(r.cnt, 10) || 0;
    });

    return {
      active,
      closed,
      pending,
      byPriority,
      byRequestType,
    };
  }

  async getOpenTicketCountsByPriority(user: User): Promise<Record<string, number>> {
    const openStatuses = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ANSWERED];
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .leftJoin('t.priority', 'p')
      .select('COALESCE(p.code, \'NONE\')', 'code')
      .addSelect('COUNT(t.id)', 'cnt')
      .where('t.status IN (:...open)', { open: openStatuses });

    if (user.role === UserRole.USER) {
      if (user.firmId) {
        qb.andWhere('u.firmId = :fid', { fid: user.firmId });
      } else {
        qb.andWhere('u.id = :uid', { uid: user.id });
      }
    }

    qb.groupBy('p.code');
    const rows = await qb.getRawMany();
    const out: Record<string, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };
    for (const r of rows) {
      const code = String(r.code ?? '');
      if (code in out) out[code] = parseInt(String(r.cnt), 10) || 0;
    }
    return out;
  }

  async getRecentTicketLogs(limit = 100) {
    return this.logRepo.find({
      relations: ['ticket', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSupportRanking() {
    const staffRoles = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN];
    const closedByUser = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.assignedToId', 'userId')
      .addSelect('COUNT(*)', 'closedCount')
      .where('t.status = :closed', { closed: TicketStatus.CLOSED })
      .andWhere('t.assignedToId IS NOT NULL')
      .groupBy('t.assignedToId')
      .getRawMany();
    const activeByUser = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.assignedToId', 'userId')
      .addSelect('COUNT(*)', 'activeCount')
      .where('t.assignedToId IS NOT NULL')
      .andWhere('t.status IN (:...statuses)', {
        statuses: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ANSWERED],
      })
      .groupBy('t.assignedToId')
      .getRawMany();
    const byPriorityByUser = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.priority', 'p')
      .select('t.assignedToId', 'userId')
      .addSelect('COALESCE(p.code, \'NONE\')', 'priorityCode')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.assignedToId IS NOT NULL')
      .andWhere('t.status IN (:...statuses)', {
        statuses: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.ANSWERED],
      })
      .groupBy('t.assignedToId')
      .addGroupBy('p.code')
      .getRawMany();

    const closedMap = new Map<string, number>();
    closedByUser.forEach((r) => closedMap.set(r.userId, parseInt(r.closedCount, 10) || 0));
    const activeMap = new Map<string, number>();
    activeByUser.forEach((r) => activeMap.set(r.userId, parseInt(r.activeCount, 10) || 0));
    const priorityMap = new Map<string, Record<string, number>>();
    const defaultByPriority = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, NONE: 0 };
    byPriorityByUser.forEach((r) => {
      const uid = r.userId;
      if (!priorityMap.has(uid)) priorityMap.set(uid, { ...defaultByPriority });
      const code = r.priorityCode || 'S3';
      if (priorityMap.get(uid)![code] !== undefined) priorityMap.get(uid)![code] = parseInt(r.cnt, 10) || 0;
    });

    const userRepo = this.ticketRepo.manager.getRepository(User);
    const staff = await userRepo.find({
      where: { role: In(staffRoles) },
      select: ['id', 'fullName', 'email', 'role'],
      order: { fullName: 'ASC' },
    });
    const result = staff.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      closedCount: closedMap.get(u.id) ?? 0,
      activeCount: activeMap.get(u.id) ?? 0,
      byPriority: priorityMap.get(u.id) ?? { ...defaultByPriority },
    }));
    result.sort((a, b) => b.closedCount - a.closedCount);
    return result;
  }
}
