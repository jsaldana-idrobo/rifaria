import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Length, Min } from 'class-validator';
import { MIN_TICKETS_PER_ORDER } from '@rifaria/shared';

export class CreateOrderDto {
  @IsString()
  @Length(3, 120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(7, 20)
  phone!: string;

  @Type(() => Number)
  @IsInt()
  @Min(MIN_TICKETS_PER_ORDER)
  ticketQty!: number;
}
