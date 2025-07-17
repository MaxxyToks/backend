import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import { DeployParams, HookAddressParam } from "./dto/params";
import { BlockchainService } from "../blockchain/blockchain.service";
import { ChainNames } from "../blockchain/constants";
import { HookMetadataIface } from "./types/types";
import { Keypair } from "@solana/web3.js";

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name);

  constructor(protected readonly blockchainService: BlockchainService) {}

  // ToolMetadata
  public async getHooks(): Promise<any> {
    return this.callHookrankService(
      "/api/v1/uniswap/hooks?isVerified=true&sort=deployedAt:desc&limit=10",
    );
  }

  // ToolMetadata
  public async getHookContractMetadata(args: HookAddressParam): Promise<any> {
    const hookMetadata: HookMetadataIface = await this.callHookrankService(
      `/api/v1/hooks/${args.hookAddress}/contract-metadata`,
    );

    const formatConstructorInputs = (constructorAbi): any => {
      return constructorAbi.inputs.map((input) => {
        const cleanName = input.name.replace(/[^a-zA-Z0-9]/g, "");
        return `${cleanName}:${input.type}`;
      });
    };

    return {
      constructorAbi: formatConstructorInputs(hookMetadata.constructorAbi),
    };
  }

  // ToolMetadata
  public async deployContractMetadata(args: DeployParams): Promise<any> {
    const hookMetadata: HookMetadataIface = await this.callHookrankService(
      `/api/v1/hooks/${args.hookAddress}/contract-metadata`,
    );

    if (!hookMetadata) throw new Error("Hook metadata not found");

    const signer = await this.getSigner({
      userId: args.userId,
      address: args.userAddress,
    });

    const deployParams = {
      signer,
      hookAddress: args.hookAddress,
      currency0: args.currency0,
      currency1: args.currency1,
      fee: args.fee,
      tickSpacing: args.tickSpacing,
      constructorParams: args.constructorParams.split(","),
    };

    const receipt =
      await this.blockchainService.deployPoolContract(deployParams);
    if (!receipt) throw new Error("Failed to deploy pool contract");

    return {
      status: "success",
      chainId: receipt.chainId || "",
      maxPriorityFeePerGas: receipt.maxPriorityFeePerGas || "",
      maxFeePerGas: receipt.maxFeePerGas || "",
      gasLimit: receipt.gasLimit || "",
      to: receipt.to || "",
      hash: receipt.hash || "",
      from: receipt.from || "",
      confirmations: receipt.confirmations || "",
    };
  }

  public async getSigner(args: {
    userId: string;
    address: string;
  }): Promise<ethers.Wallet | Keypair> {
    return this.blockchainService.getUserWallet(
      ChainNames.ETHEREUM,
      args.userId,
      args.address,
    );
  }

  protected async callHookrankService(path: string): Promise<any> {
    const url = `https://icxkbjaysw.us-east-1.awsapprunner.com${path}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
      this.logger.error(`HTTP Error: ${response.status}`);
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const res = await response.json();

    return res.data;
  }
}
