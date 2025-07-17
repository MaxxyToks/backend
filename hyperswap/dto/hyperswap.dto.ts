import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';


export class QuoteSwapDto {
    @ApiProperty({
        description: 'Symbol or address of the token you are swapping from.',
        example: 'HYPE',
    })
    @IsNotEmpty()
    @IsString()
    tokenSymbolFrom: string;

    @ApiProperty({
        description: 'Symbol or address of the token you are swapping to.',
        example: 'USDT',
    })
    @IsNotEmpty()
    @IsString()
    tokenSymbolTo: string;

    @ApiProperty({
        description: 'Amount of the `tokenSymbolFrom` token to be swapped.',
        example: '1.0',
    })
    @IsNotEmpty()
    @IsString()
    amountIn: string;
}

