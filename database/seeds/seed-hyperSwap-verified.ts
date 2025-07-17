import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { sleep } from 'common/utils/sleep';
import { firstValueFrom } from 'rxjs';
import { Pool } from '../entities/hyperswap-pool.entity';
import { PoolRepository } from '../repository/hyperswap-pool.repository';

interface HyperswapResponse {
    success: boolean;
    data: {
        allPairsLength: number;
        page: number;
        pageCount: number;
        maxPerPage: number;
        pairs: Array<{
            pairAddress: string;
            token0: {
                token0Address: string;
                token0Name: string;
                token0Symbol: string;
                token0Decimal: number;
            };
            token1: {
                token1Address: string;
                token1Name: string;
                token1Symbol: string;
                token1Decimal: number;
            };
            reserves: {
                reserve0: string;
                reserve1: string;
            };
            version: string;
            fee: number;
            display: boolean;
        }>;
    };
}

@Injectable()
export class SeedPoolsVerifiedService {
    private readonly logger = new Logger(SeedPoolsVerifiedService.name);
    private readonly baseUrl = 'https://api.hyperswap.exchange/api/pairs';
    private readonly maxPerPage = 10;

    constructor(
        private readonly httpService: HttpService,
        private readonly poolRepository: PoolRepository,
    ) { }

    public async seed(): Promise<void> {
        const count = await this.poolRepository.count();
        if (count > 0) {
            this.logger.log('Pools already seeded, skipping.');
            return;
        }
        const firstPageUrl = `${this.baseUrl}?page=1&maxPerPage=${this.maxPerPage}`;
        const firstResponse = await firstValueFrom(this.httpService.get<HyperswapResponse>(firstPageUrl));
        if (!firstResponse.data.success) {
            this.logger.error('Failed to fetch first page from API.');
            return;
        }

        const { pageCount } = firstResponse.data.data;
        this.logger.log(`Total pages to fetch: ${pageCount}`);

        for (let page = 0; page <= pageCount; page++) {
            const url = `${this.baseUrl}?page=${page}&maxPerPage=${this.maxPerPage}`;
            this.logger.log(`Fetching page ${page}...`);
            const response = await firstValueFrom(this.httpService.get<HyperswapResponse>(url));
            if (!response.data.success) {
                this.logger.error(`Failed to fetch page ${page}`);
                continue;
            }

            const pairs = response.data.data.pairs;
            for (const pair of pairs) {
                const existingPool = await this.poolRepository.findByPairAddress(pair.pairAddress.toLowerCase());
                if (existingPool) {
                    this.logger.debug(`Pool ${pair.pairAddress} already exists, skipping.`);
                    continue;
                }
                const pool = new Pool();
                try {
                    pool.pairAddress = (pair.pairAddress ?? "").toLowerCase();

                    pool.token0Address = (pair.token0.token0Address ?? "").toLowerCase();
                    pool.token0Name = pair.token0.token0Name;
                    pool.token0Symbol = pair.token0.token0Symbol;
                    pool.token0Decimals = pair.token0.token0Decimal;

                    pool.token1Address = (pair.token1.token1Address ?? "").toLowerCase();
                    pool.token1Name = pair.token1.token1Name;
                    pool.token1Symbol = pair.token1.token1Symbol;
                    pool.token1Decimals = pair.token1.token1Decimal;

                    pool.reserve0 = pair.reserves.reserve0;
                    pool.reserve1 = pair.reserves.reserve1;
                    pool.version = pair.version;
                    pool.fee = pair.fee;
                    pool.display = pair.display;

                    await this.poolRepository.save(pool);

                } catch (error) {
                    this.logger.log(`Failed to parse pool ${pair.token0.token0Symbol} ${pair.token1.token1Symbol}`);
                }
                this.logger.debug(`Seeded pool: ${pool.pairAddress}`);
            }
            await sleep(500);
        }

        this.logger.log('Seed pools completed.');
    }
}
