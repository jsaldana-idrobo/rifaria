import { IsString, IsUrl, Matches } from 'class-validator';

export class SettleDrawDto {
  @IsString()
  @Matches(/^\d{4}$/)
  winningNumber!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  drawResultSourceUrl!: string;
}
