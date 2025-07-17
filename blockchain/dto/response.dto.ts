import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

import { DexToolsRankingPool } from 'modules/dextools/dto/dextools.dto';

export class BasicBlockchainResponseDto {
  @ApiProperty({
    description: 'The url to the transaction on the blockchain explorer',
    example: 'https://sepolia.etherscan.io/tx/0x123456789abcdef',
  })
  @IsString()
  explorerUrl: string;

  @ApiProperty({
    description: 'The transaction hash',
    example: '0x123456789abcdef',
  })
  @IsString()
  transactionHash: string;

  description?: string;
}

export class NewContractResponseDto extends BasicBlockchainResponseDto {
  @ApiProperty({
    description: 'The address of the new contract',
    example: '0x123456789abcdef',
  })
  @IsString()
  address: string;
}

export class OnlyAddressResponseDto {
  @ApiProperty({
    description: 'The address of the new contract',
    example: '0x123456789abcdef',
  })
  @IsString()
  address: string;
}

export class TransferResponseDto extends BasicBlockchainResponseDto {
  @ApiProperty({
    description: 'The address of the user from which the asset was transferred',
    example: '0x123456789abcdef',
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: 'The address of the user to which the asset was transferred',
    example: '0x123456789abcdef',
  })
  @IsString()
  to: string;

  @ApiProperty({
    description: 'The amount of the asset that was transferred',
    example: '1',
  })
  @IsString()
  amount: string;

  @ApiPropertyOptional({
    description: 'Whether the transfer was an ERC20 transfer',
    example: false,
  })
  @IsBoolean()
  isERC20?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the transfer was a native transfer',
    example: false,
  })
  @IsBoolean()
  isNative?: boolean;

  @ApiPropertyOptional({
    description: 'Additional message',
    example: 'Transaction successful',
  })
  @IsString()
  additionalMessage?: string;
}

export class SwapResponseDto {
  transactionHash: string;
  explorerUrl: string;
  from: string;
  fromSymbol: string;
  toSymbol: string;
  fromMint: string;
  toMint: string;
  amount: string;
  additionalMessage?: string;
}

export type BoostedAssetsWithMetadataDto = DexToolsRankingPool & {
  tokenName?: string;
  tokenSymbol?: string;
  price?: number;
  priceChain?: number;
  price5m?: number;
  priceChain5m?: number;
  variation5m?: number;
  price1h?: number;
  priceChain1h?: number;
  variation1h?: number;
  price6h?: number;
  priceChain6h?: number;
  variation6h?: number;
  price24h?: number;
  priceChain24h?: number;
  variation24h?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  mcap?: number;
  fdv?: number;
  holders?: number;
  transactions?: number;
};
