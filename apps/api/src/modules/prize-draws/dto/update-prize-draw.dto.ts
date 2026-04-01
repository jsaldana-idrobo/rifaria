import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { prizeDrawTypes } from '@rifaria/shared';

export class UpdatePrizeDrawDto {
  @IsOptional()
  @IsString()
  @Length(3, 140)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 1200)
  description?: string;

  @IsOptional()
  @IsIn(prizeDrawTypes)
  prizeType?: (typeof prizeDrawTypes)[number];

  @IsOptional()
  @IsString()
  @Length(2, 140)
  displayValue?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  drawAt?: Date;

  @IsOptional()
  @IsString()
  @Length(3, 200)
  drawSource?: string;

  @IsOptional()
  @IsBoolean()
  isMajorPrize?: boolean;
}
