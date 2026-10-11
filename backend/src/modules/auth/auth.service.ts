import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async accountExists(email: string): Promise<{ exists: boolean }> {
    const user = await this.resolveUserForLogin(email);
    return { exists: !!user };
  }

  async login(dto: LoginDto) {
    const user = await this.resolveUserForLogin(dto.email);
    if (user) {
      return this.loginExistingUser(user, dto.password, dto.email);
    }

    return this.loginFirstTimeCreate(dto);
  }

  private async loginExistingUser(user: User, plainPassword: string, loginEmail: string) {
    if (!user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    let valid = await bcrypt.compare(plainPassword, user.password);
    if (!valid && user.role === UserRole.OWNER) {
      const configuredPass = process.env.ADMIN_PASSWORD ?? 'admin';
      const configuredEmail = (process.env.ADMIN_EMAIL || 'admin').toLowerCase().trim();
      const em = loginEmail.trim().toLowerCase();
      if (
        plainPassword === configuredPass &&
        (em === 'admin' || em === configuredEmail)
      ) {
        await this.usersService.updatePasswordHash(
          user.id,
          await bcrypt.hash(plainPassword, 10),
        );
        valid = true;
      }
    }
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.generateToken(user);
  }

  private async loginFirstTimeCreate(dto: LoginDto) {
    const e = (dto.email || '').trim().toLowerCase();
    if (e === 'admin') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }
    if (dto.passwordConfirm === undefined || dto.passwordConfirm === '') {
      throw new BadRequestException('Re-enter your password to confirm on first sign-in.');
    }
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match.');
    }
    try {
      const hashed = await bcrypt.hash(dto.password, 10);
      const localPart = dto.email.trim().split('@')[0] || 'User';
      const fullName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
      const newUser = await this.usersService.create({
        email: e,
        password: hashed,
        fullName,
        role: UserRole.USER,
      });
      const withFirm = await this.usersService.findById(newUser.id);
      return this.generateToken(withFirm ?? newUser);
    } catch (err) {
      if (err instanceof ConflictException) {
        const u = await this.resolveUserForLogin(dto.email);
        if (u) return this.loginExistingUser(u, dto.password, dto.email);
      }
      throw err;
    }
  }

  private async resolveUserForLogin(email: string): Promise<User | null> {
    const e = (email || '').trim().toLowerCase();
    const configuredAdmin = (process.env.ADMIN_EMAIL || 'admin').toLowerCase().trim();
    if (e === 'admin') {
      let u = await this.usersService.findByEmail(configuredAdmin);
      if (!u) {
        u = await this.usersService.findOwnerUser();
      }
      return u;
    }
    return this.usersService.findByEmail(e);
  }

  private generateToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        firmId: user.firmId ?? null,
        firmName: user.firm?.name ?? null,
      },
    };
  }
}
