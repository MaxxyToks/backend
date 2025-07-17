
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Keypair } from '@solana/web3.js';
import { Wallet } from 'ethers';
import { ChainNames } from 'modules/blockchain/constants';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { SolanaUtils } from 'modules/blockchain/solana.utils';
import { SettingsService } from 'modules/settings/settings.service';

export enum Ops {
  SWAP,
  BRIDGE,
  TRANSFER
}

@Injectable()

export class FeeService {
  private fees: { [key in Ops]: number } = {
    [Ops.SWAP]: parseFloat(this.settingsService.getSettings().feeConfig.swapFee),
    [Ops.BRIDGE]: parseFloat(this.settingsService.getSettings().feeConfig.bridgeFee),
    [Ops.TRANSFER]: parseFloat(this.settingsService.getSettings().feeConfig.transferFee),
  };

  private treasuries: { evmTreasury?: string, solanaTreasury?: string } = {};

  private readonly logger = new Logger(FeeService.name);

  constructor(
    @Inject(forwardRef(() => EvmUtils))
    private readonly evmUtils: EvmUtils,
    @Inject(forwardRef(() => SolanaUtils))
    private readonly solanaUtils: SolanaUtils,
    private readonly settingsService: SettingsService,
  ) {
    if (this.fees[Ops.SWAP] < 0 || this.fees[Ops.BRIDGE] < 0 || this.fees[Ops.TRANSFER] < 0) {
      throw new Error('Fee cannot be negative');
    }
    if (this.fees[Ops.SWAP] >= 100 || this.fees[Ops.BRIDGE] >= 100 || this.fees[Ops.TRANSFER] >= 100) {
      throw new Error('Total fee cannot be more than 100%');
    }

    this,
      this.treasuries.evmTreasury = this.settingsService.getSettings().feeConfig.evmTreasury;
    this.treasuries.solanaTreasury = this.settingsService.getSettings().feeConfig.solanaTreasury;
  }

  async payFee(chainName: ChainNames, amount: string, tokenAddress: string, isNative: boolean, wallet: Wallet | Keypair, op: Ops): Promise<string> {
    const feeAmount = parseFloat(amount) * this.fees[op] / 100;
    const rest = parseFloat(amount) - feeAmount;
    this.logger.log(`Paying fee ${feeAmount} of ${isNative ? "native token" : tokenAddress} on ${chainName}`);
    if (!rest) {
      throw new Error('Amount in is too low');
    }
    if (chainName === ChainNames.SOLANA) {
      if (!this.treasuries.solanaTreasury) {
        return amount;
      }

      if (isNative) {
        await this.solanaUtils.sendNative(wallet as Keypair, this.treasuries.solanaTreasury, feeAmount, false);
        return String(rest)
      }
      await this.solanaUtils.sendSPL(wallet as Keypair, this.treasuries.solanaTreasury, tokenAddress, feeAmount, false);
    } else {
      if (!this.treasuries.evmTreasury) {
        return amount;
      }

      if (isNative) {
        await this.evmUtils.sendNative({ wallet: (wallet as Wallet), to: this.treasuries.evmTreasury, amount: feeAmount.toString(), taxable: false });
        return String(rest)
      }
      await this.evmUtils.sendERC20({ wallet: (wallet as Wallet), chainName, to: this.treasuries.evmTreasury, amount: feeAmount.toString(), contractAddress: tokenAddress, taxable: false });
    }
    return String(rest);
  }
}
