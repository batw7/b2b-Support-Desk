import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.productRepo.find({ order: { name: 'ASC' } });
  }

  async create(name: string): Promise<Product> {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Product name is required.');
    return this.productRepo.save(this.productRepo.create({ name: trimmed }));
  }

  async update(id: string, name: string): Promise<Product> {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Product name is required.');
    const p = await this.productRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Product not found.');
    p.name = trimmed;
    return this.productRepo.save(p);
  }

  async remove(id: string): Promise<void> {
    const res = await this.productRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Product not found.');
  }

  async findById(id: string): Promise<Product | null> {
    return this.productRepo.findOne({ where: { id } });
  }
}
