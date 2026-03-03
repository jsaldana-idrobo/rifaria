import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsString, Length } from 'class-validator';

export class PostponeRaffleDto {
  @Type(() => Date)
  @IsDate()
  newDrawAt!: Date;

  @IsString()
  @Length(10, 500)
  reason!: string;

  @Type(() => Boolean)
  @IsBoolean()
  notifyParticipants!: boolean;
}
