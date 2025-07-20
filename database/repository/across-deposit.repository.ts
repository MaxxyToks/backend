import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChainNames, getChainIdByName } from '../../modules/blockchain/constants';

import { BaseRepository } from './base.repository';
import { AcrossDeposit } from '../entities/across-deposit.entity';

@Injectable()
export class AcrossDepositRepository extends BaseRepository<AcrossDeposit> {
  constructor(
    @InjectRepository(AcrossDeposit)
    repository: Repository<AcrossDeposit>,
  ) {
    super(repository);
  }

  public async createAcrossDeposit(
    originSpokeContract: string,
    fromAddress: string,
    toAddress: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    originChainName: ChainNames,
    destinationChainName: ChainNames,
    depositTx: string,
  ): Promise<AcrossDeposit> {
    const acrossDeposit = new AcrossDeposit();
    acrossDeposit.originSpokeContract = originSpokeContract;
    acrossDeposit.fromAddress = fromAddress;
    acrossDeposit.toAddress = toAddress;
    acrossDeposit.inputToken = inputToken;
    acrossDeposit.inputAmount = amount;
    acrossDeposit.outputToken = outputToken;
    acrossDeposit.originChainName = originChainName;
    acrossDeposit.destinationChainName = destinationChainName;
    acrossDeposit.originalChainId = getChainIdByName(originChainName);
    acrossDeposit.destinationChainId = getChainIdByName(destinationChainName);
    acrossDeposit.depositTx = depositTx;
    return this.save(acrossDeposit);
  }
}
