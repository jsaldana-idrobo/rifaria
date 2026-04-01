import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { prizeDrawTypes } from '@rifaria/shared';

export class CreatePrizeDrawDto {
  @IsString()
  @Length(3, 140)
  title!: string;

  @IsString()
  @Length(10, 1200)
  description!: string;

  @IsIn(prizeDrawTypes)
  prizeType!: (typeof prizeDrawTypes)[number];

  @IsString()
  @Length(2, 140)
  displayValue!: string;

  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @Type(() => Date)
  @IsDate()
  drawAt!: Date;

  @IsString()
  @Length(3, 200)
  drawSource!: string;

  @IsOptional()
  @IsBoolean()
  isMajorPrize?: boolean;
}
