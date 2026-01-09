import { IsString, IsNotEmpty } from 'class-validator';

export class AskAiDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
