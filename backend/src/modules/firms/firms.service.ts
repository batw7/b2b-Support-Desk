import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Firm } from './entities/firm.entity';

@Injectable()
export class FirmsService {
  constructor(
    @InjectRepository(Firm)
    private readonly firmRepo: Repository<Firm>,
  ) {}

  findAll(): Promise<Firm[]> {
    return this.firmRepo.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<Firm> {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Firm name is required.');
    const firm = this.firmRepo.create({ name: trimmed });
    return this.firmRepo.save(firm);
  }

  async update(id: string, name: string): Promise<Firm> {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Firm name is required.');
    const firm = await this.firmRepo.findOne({ where: { id } });
    if (!firm) throw new NotFoundException('Firm not found.');
    firm.name = trimmed;
    return this.firmRepo.save(firm);
  }

  async remove(id: string): Promise<void> {
    const res = await this.firmRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Firm not found.');
  }

  async findById(id: string): Promise<Firm | null> {
    return this.firmRepo.findOne({ where: { id } });
  }
}
