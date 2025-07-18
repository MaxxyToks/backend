import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class SubscribeToDcaDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userAddress: string;

  @ApiProperty()
  @IsString()
  tokenIn: string;

  @ApiProperty()
  @IsString()
  tokenOut: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsNumber()
  interval: number; // in seconds

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slippage?: string;
}

export class CloseDcaDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userAddress: string;

  @ApiProperty()
  @IsString()
  dcaId: string;

  @ApiProperty()
  @IsString()
  chainName: string;
}

export class GetDcaDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userAddress: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chainName?: string;
}

export class DcaBuyDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userAddress: string;

  @ApiProperty()
  @IsString()
  dcaId: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  chainName: string;
} 