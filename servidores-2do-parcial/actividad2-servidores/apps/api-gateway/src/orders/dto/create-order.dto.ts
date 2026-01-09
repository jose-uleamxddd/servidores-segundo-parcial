import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}
