export interface PriceChangeInput {
  currentPrice: number;
  transfersIn: number;
  transfersOut: number;
  totalTeams: number;
}

export interface PriceEngineRules {
  minimumNetTransfers: number;
  ownershipMovementRatio: number;
  minimumPrice: number;
  maximumPrice: number;
}

export const defaultPriceEngineRules: PriceEngineRules = {
  minimumNetTransfers: 10,
  ownershipMovementRatio: 0.01,
  minimumPrice: 35,
  maximumPrice: 150,
};

export function calculateNextPrice(
  input: PriceChangeInput,
  rules: PriceEngineRules = defaultPriceEngineRules,
): number {
  const threshold = Math.max(rules.minimumNetTransfers, Math.ceil(input.totalTeams * rules.ownershipMovementRatio));
  const movement = input.transfersIn - input.transfersOut;
  if (movement >= threshold) return Math.min(rules.maximumPrice, input.currentPrice + 1);
  if (movement <= -threshold) return Math.max(rules.minimumPrice, input.currentPrice - 1);
  return input.currentPrice;
}
