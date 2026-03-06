import { BadRequestException } from '@nestjs/common';

const CONVERSION_TO_BASE: Record<string, number> = {
  kg: 1000,
  gr: 1,
  lt: 1000,
  ml: 1,
  adet: 1,
};

const UNIT_GROUP: Record<string, 'weight' | 'volume' | 'piece'> = {
  kg: 'weight',
  gr: 'weight',
  lt: 'volume',
  ml: 'volume',
  adet: 'piece',
  paket: 'piece',
  koli: 'piece',
};

export function getUnitGroup(unit: string): 'weight' | 'volume' | 'piece' {
  const group = UNIT_GROUP[unit];
  if (!group) {
    throw new BadRequestException(`Bilinmeyen birim: ${unit}`);
  }
  return group;
}

export function normalizeBaseUnit(unit: string): 'gr' | 'ml' | 'adet' {
  const group = getUnitGroup(unit);
  if (group === 'weight') {
    return 'gr';
  }
  if (group === 'volume') {
    return 'ml';
  }
  return 'adet';
}

export function toBaseUnit(value: number, unit: string, packSize = 1): number {
  if (unit === 'paket' || unit === 'koli') {
    return Number((value * packSize).toFixed(4));
  }
  const factor = CONVERSION_TO_BASE[unit];
  if (!factor) {
    throw new BadRequestException(`Bilinmeyen birim: ${unit}`);
  }
  return Number((value * factor).toFixed(4));
}

export function assertSameGroup(
  ingredientBaseUnit: string,
  recipeUnit: string,
): void {
  const ingredientGroup = getUnitGroup(ingredientBaseUnit);
  const recipeGroup = getUnitGroup(recipeUnit);
  if (ingredientGroup !== recipeGroup) {
    throw new BadRequestException(
      `Birim grubu uyuşmazlığı: ${ingredientBaseUnit} ↔ ${recipeUnit}`,
    );
  }
}

export function formatStock(baseQty: number, baseUnit: string): string {
  if (baseUnit === 'gr' && baseQty >= 1000) {
    return `${(baseQty / 1000).toFixed(2)} kg`;
  }
  if (baseUnit === 'ml' && baseQty >= 1000) {
    return `${(baseQty / 1000).toFixed(2)} lt`;
  }
  return `${baseQty} ${baseUnit}`;
}
