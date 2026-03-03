import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested
} from 'class-validator';

class WompiSignatureDto {
  @IsOptional()
  @IsString()
  @Length(10, 256)
  checksum?: string;
}

class WompiTransactionDto {
  @IsString()
  @Length(2, 120)
  id!: string;

  @IsString()
  @Length(10, 120)
  reference!: string;

  @IsString()
  @Length(2, 64)
  status!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount_in_cents!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsOptional()
  @IsString()
  @Length(2, 64)
  payment_method_type?: string;

  @IsOptional()
  @IsString()
  @Length(3, 254)
  customer_email?: string;
}

class WompiWebhookDataDto {
  @ValidateNested()
  @Type(() => WompiTransactionDto)
  transaction!: WompiTransactionDto;
}

export class WompiWebhookDto {
  @IsString()
  @Length(3, 80)
  event!: string;

  @ValidateNested()
  @Type(() => WompiWebhookDataDto)
  data!: WompiWebhookDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WompiSignatureDto)
  signature?: WompiSignatureDto;

  @IsOptional()
  @IsString()
  @IsISO8601()
  sent_at?: string;
}
