import { IsMongoId, IsString, IsUrl, Length } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @Length(10, 64)
  @IsMongoId()
  orderId!: string;

  @IsUrl({ require_tld: false })
  returnUrl!: string;
}
