import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export const userRoles = ['owner', 'admin', 'support', 'viewer'] as const;
export type UserRole = (typeof userRoles)[number];

@Schema({ timestamps: true })
export class User {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: String, enum: userRoles, default: 'viewer' })
  role!: UserRole;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
