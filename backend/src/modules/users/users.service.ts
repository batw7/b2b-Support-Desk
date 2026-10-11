import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';
import { FirmsService } from '../firms/firms.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private firmsService: FirmsService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase() },
      relations: ['firm'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id }, relations: ['firm'] });
  }

  async findOwnerUser(): Promise<User | null> {
    return this.userRepo.findOne({
      where: { role: UserRole.OWNER },
      order: { createdAt: 'ASC' },
      relations: ['firm'],
    });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.userRepo.update(id, { password: passwordHash });
  }

  async create(data: Partial<User>): Promise<User> {
    const existing = await this.findByEmail(data.email!);
    if (existing) {
      throw new ConflictException('This email address is already registered.');
    }
    const user = this.userRepo.create({
      ...data,
      email: data.email!.toLowerCase(),
      firmId: null,
    });
    return this.userRepo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    if (data.email !== undefined) {
      const normalized = data.email.toLowerCase();
      const existing = await this.findByEmail(normalized);
      if (existing && existing.id !== id) {
        throw new ConflictException('This email address is already in use by another user.');
      }
      (data as any).email = normalized;
    }
    await this.userRepo.update(id, data as any);
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found');
    return updated;
  }

  async findAll(role?: UserRole): Promise<User[]> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.firm', 'firm')
      .orderBy('u.createdAt', 'DESC');
    if (role) qb.andWhere('u.role = :role', { role });
    return qb.getMany();
  }

  async findStaff(): Promise<User[]> {
    return this.userRepo.find({
      where: { role: In([UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN]) },
      relations: ['firm'],
      order: { createdAt: 'DESC' },
    });
  }

  async assignRoleByEmail(email: string, newRole: UserRole, byUser: User): Promise<User> {
    if (newRole !== UserRole.ADMIN) {
      throw new BadRequestException('Only the Support team (admin) role can be assigned via authorization.');
    }
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) throw new BadRequestException('Email is required.');
    const target = await this.userRepo.findOne({
      where: { email: normalized },
      relations: ['firm'],
    });
    if (!target) {
      throw new NotFoundException(
        'No user is registered with this email. They must sign up from the login page first.',
      );
    }
    return this.setRole(byUser.id, target.id, newRole);
  }

  async seedOwnerIfNeeded(): Promise<void> {
    const existingOwner = await this.userRepo.findOne({ where: { role: UserRole.OWNER } });
    if (existingOwner) return;
    const email = (process.env.ADMIN_EMAIL || 'admin').toLowerCase();
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      existingUser.role = UserRole.OWNER;
      const password = process.env.ADMIN_PASSWORD || 'admin';
      existingUser.password = await bcrypt.hash(password, 10);
      await this.userRepo.save(existingUser);
      return;
    }
    const password = process.env.ADMIN_PASSWORD || 'admin';
    const hashed = await bcrypt.hash(password, 10);
    const owner = this.userRepo.create({
      email,
      password: hashed,
      fullName: process.env.ADMIN_FULL_NAME || 'Nevers Owner',
      role: UserRole.OWNER,
      firmId: null,
    });
    await this.userRepo.save(owner);
  }

  async setRole(byUserId: string, targetUserId: string, newRole: UserRole): Promise<User> {
    const byUser = await this.findById(byUserId);
    const target = await this.findById(targetUserId);
    if (!byUser) throw new NotFoundException('Authorizing user not found.');
    if (!target) throw new NotFoundException('Target user not found.');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('Owner role cannot be changed.');
    if (newRole === UserRole.OWNER) throw new ForbiddenException('Owner role cannot be assigned.');
    if (newRole === UserRole.SYSTEM_SUPPORT && byUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owner can assign the system support role.');
    }
    const canAssignDestek = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(
      byUser.role,
    );
    if (newRole === UserRole.ADMIN && !canAssignDestek) {
      throw new ForbiddenException('You are not allowed to assign the support team role.');
    }
    target.role = newRole;
    if (newRole !== UserRole.USER) {
      target.firmId = null;
    }
    await this.userRepo.save(target);
    return this.findById(targetUserId) as Promise<User>;
  }

  async setFirm(byUser: User, targetUserId: string, firmId: string | null): Promise<User> {
    const isStaff = [UserRole.OWNER, UserRole.SYSTEM_SUPPORT, UserRole.ADMIN].includes(byUser.role);
    if (!isStaff) throw new ForbiddenException('Unauthorized.');
    const target = await this.findById(targetUserId);
    if (!target) throw new NotFoundException('User not found.');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('A firm cannot be assigned to Owner.');
    if (firmId) {
      const firm = await this.firmsService.findById(firmId);
      if (!firm) throw new NotFoundException('Firm not found.');
    }
    target.firmId = firmId;
    await this.userRepo.save(target);
    return this.findById(targetUserId) as Promise<User>;
  }
}
