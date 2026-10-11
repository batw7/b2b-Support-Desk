import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private repo: Repository<Announcement>,
  ) {}

  async create(dto: CreateAnnouncementDto & { staffOnly?: boolean }) {
    const a = this.repo.create(dto);
    if (dto.publishAt) a.publishAt = new Date(dto.publishAt);
    if (dto.expiresAt) a.expiresAt = new Date(dto.expiresAt);
    if (dto.staffOnly !== undefined) a.staffOnly = !!dto.staffOnly;
    return this.repo.save(a);
  }

  async findActiveForViewer(isStaff: boolean) {
    const now = new Date();
    const list = await this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return list.filter(
      (a) =>
        (!a.publishAt || a.publishAt <= now) &&
        (!a.expiresAt || a.expiresAt >= now) &&
        (!a.staffOnly || isStaff),
    );
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found.');
    return a;
  }

  async update(id: string, dto: Partial<CreateAnnouncementDto & { staffOnly?: boolean }>) {
    await this.findOne(id);
    const patch = { ...dto } as Record<string, unknown>;
    if (dto.publishAt) patch.publishAt = new Date(dto.publishAt);
    if (dto.expiresAt) patch.expiresAt = new Date(dto.expiresAt);
    if (dto.staffOnly !== undefined) patch.staffOnly = !!dto.staffOnly;
    await this.repo.update(id, patch as any);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { success: true };
  }
}
