import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { compare, hash } from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './schemas/user.schema';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async bootstrapAdmin(dto: CreateAdminDto): Promise<{ id: string; email: string }> {
    const existingAdmin = await this.userModel.exists({ role: { $in: ['owner', 'admin'] } });
    if (existingAdmin) {
      throw new BadRequestException('Admin bootstrap is disabled because admins already exist');
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role,
      isActive: true,
      lastLoginAt: null
    });

    await this.auditService.log({
      action: 'auth.bootstrap_admin',
      entityType: 'user',
      entityId: String(user._id),
      actorType: 'system',
      actorId: null,
      metadata: {
        email: user.email,
        role: user.role
      }
    });

    return {
      id: String(user._id),
      email: user.email
    };
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; fullName: string; email: string; role: string };
  }> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (user?.isActive !== true) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: String(user._id),
        email: user.email,
        role: user.role,
        tokenType: 'access'
      },
      { expiresIn: '30m' }
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: String(user._id),
        email: user.email,
        role: user.role,
        tokenType: 'refresh'
      },
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'dev-refresh-secret-change-me'
        ),
        expiresIn: '7d'
      }
    );

    await this.auditService.log({
      action: 'auth.login',
      entityType: 'user',
      entityId: String(user._id),
      actorType: 'admin',
      actorId: String(user._id),
      metadata: {
        email: user.email
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    };
  }

  async getUserById(userId: string): Promise<PublicUser> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async listUsers(limit = 100): Promise<PublicUser[]> {
    const users = await this.userModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return users.map((user) => this.toPublicUser(user));
  }

  private toPublicUser(user: PublicUserSource): PublicUser {
    return {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null
    };
  }
}

interface PublicUserSource {
  _id: unknown;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
