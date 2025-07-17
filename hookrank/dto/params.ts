export class HookAddressParam {
  hookAddress: string;
}

export class HookMetadataParams {
  constructorAbi: object[];
}

export class DeployParams {
  userId: string;
  userAddress: string;
  hookAddress: string;
  currency0: string;
  currency1: string;
  tickSpacing: string;
  fee: string;
  constructorParams: string;
}
