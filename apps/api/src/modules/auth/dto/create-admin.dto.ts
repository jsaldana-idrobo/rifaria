import { IsEmail, IsIn, IsString, Length } from 'class-validator';
import { userRoles } from '../schemas/user.schema';

export class CreateAdminDto {
  @IsString()
  @Length(3, 120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsIn(userRoles)
  role!: (typeof userRoles)[number];
}
