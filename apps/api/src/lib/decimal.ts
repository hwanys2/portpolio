import { Decimal } from "@prisma/client/runtime/library";

export function toDecimal(value: number | string): Decimal {
  return new Decimal(value);
}

export function decToNumber(value: Decimal): number {
  return value.toNumber();
}


