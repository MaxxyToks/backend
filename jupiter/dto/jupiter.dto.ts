import { TokenMetadataDto } from '../../swap-orders/dto/order.dto';

export class SwapSolanaParams {
    userId: string;
    fromAddress: string;
    tokenMetadataFrom: TokenMetadataDto;
    tokenMetadataTo: TokenMetadataDto;
    amount: string;
    slippageBps?: number;
}

export class SwapSolanaParamsExt {
    userId: string;
    fromAddress: string;
    tokenSymbolFrom: string;
    tokenSymbolTo: string;
    amount: string;
    slippageBps?: number;
}