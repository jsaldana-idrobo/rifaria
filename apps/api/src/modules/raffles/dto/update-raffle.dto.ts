import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min
} from 'class-validator';
import { raffleStatuses } from '@rifaria/shared';

export class UpdateRaffleDto {
  @IsOptional()
  @IsString()
  @Length(3, 140)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  prizeName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  prizeImageUrl?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  drawAt?: Date;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  drawSource?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  totalTickets?: number;

  @IsOptional()
  @IsIn(raffleStatuses)
  status?: (typeof raffleStatuses)[number];

  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  galleryImages?: string[];
}
