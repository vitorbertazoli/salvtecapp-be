import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateFromQuoteDto {
  @IsNotEmpty()
  @IsMongoId()
  quoteId: string;

  @IsNotEmpty()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority: 'low' | 'normal' | 'high' | 'urgent';
}
