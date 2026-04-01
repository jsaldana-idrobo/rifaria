import { IsArray, IsMongoId } from 'class-validator';

export class ReorderPrizeDrawsDto {
  @IsArray()
  @IsMongoId({ each: true })
  orderedIds!: string[];
}
