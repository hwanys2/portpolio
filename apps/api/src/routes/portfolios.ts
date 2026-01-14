import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { quoteSymbol } from "../lib/yahoo";
import { decToNumber, toDecimal } from "../lib/decimal";
import type { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

export const portfoliosRouter = Router();

type PortfolioListRow = { id: string; name: string; initialInvestAmount: Decimal; createdAt: Date };
type AssetInfo = { id: string; symbol: string; name: string | null; exchange: string | null; currency: string | null };
type PortfolioItemDetail = {
  id: string;
  targetWeight: Decimal;
  tolerance: Decimal | null;
  entryPrice: Decimal;
  initialQuantity: Decimal;
  currentQuantity: Decimal;
  asset: AssetInfo;
};
type PortfolioDetail = {
  id: string;
  name: string;
  initialInvestAmount: Decimal;
  createdAt: Date;
  items: PortfolioItemDetail[];
};
type PortfolioRefreshItem = {
  id: string;
  targetWeight: Decimal;
  tolerance: Decimal | null;
  currentQuantity: Decimal;
  asset: { symbol: string; name: string | null };
};
type PortfolioRefresh = { id: string; name: string; items: PortfolioRefreshItem[] };

const createSchema = z.object({
  name: z.string().min(1),
  initialInvestAmount: z.number().positive(),
  items: z
    .array(
      z.object({
        symbol: z.string().min(1),
        targetWeight: z.number().positive(),
        tolerance: z.number().positive().optional(),
      }),
    )
    .min(1),
});

portfoliosRouter.get("/", requireAuth, async (req, res) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, initialInvestAmount: true, createdAt: true },
  });
  const typed = portfolios as unknown as PortfolioListRow[];
  return res.json({
    portfolios: typed.map((p) => ({
      ...p,
      initialInvestAmount: decToNumber(p.initialInvestAmount),
    })),
  });
});

portfoliosRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, initialInvestAmount, items } = parsed.data;

  // Fetch quotes first
  const normalized = items.map((it) => ({
    ...it,
    symbol: it.symbol.trim(),
  }));

  const quotes = await Promise.all(
    normalized.map(async (it) => {
      const q = await quoteSymbol(it.symbol);
      return { ...it, quote: q };
    }),
  );

  const portfolio = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.portfolio.create({
      data: {
        userId: req.auth!.userId,
        name,
        initialInvestAmount: toDecimal(initialInvestAmount),
      },
      select: { id: true, name: true, initialInvestAmount: true, createdAt: true },
    });

    for (const it of quotes) {
      const asset = await tx.asset.upsert({
        where: { symbol: it.quote.symbol },
        create: {
          symbol: it.quote.symbol,
          name: it.quote.name,
          exchange: it.quote.exchange,
          currency: it.quote.currency,
        },
        update: {
          name: it.quote.name ?? undefined,
          exchange: it.quote.exchange ?? undefined,
          currency: it.quote.currency ?? undefined,
        },
        select: { id: true, symbol: true, name: true, exchange: true, currency: true },
      });

      const investForItem = (initialInvestAmount * it.targetWeight) / 100;
      const initialQuantity = investForItem / it.quote.price;

      await tx.portfolioItem.create({
        data: {
          portfolioId: created.id,
          assetId: asset.id,
          targetWeight: toDecimal(it.targetWeight),
          tolerance: it.tolerance != null ? toDecimal(it.tolerance) : null,
          entryPrice: toDecimal(it.quote.price),
          initialQuantity: toDecimal(initialQuantity),
          currentQuantity: toDecimal(initialQuantity),
        },
      });
    }

    return created;
  });

  const typed = portfolio as unknown as PortfolioListRow;
  return res.status(201).json({
    portfolio: { ...typed, initialInvestAmount: decToNumber(typed.initialInvestAmount) },
  });
});

portfoliosRouter.get("/:id", requireAuth, async (req, res) => {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const p = await prisma.portfolio.findFirst({
    where: { id: parsed.data.id, userId: req.auth!.userId },
    select: {
      id: true,
      name: true,
      initialInvestAmount: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          targetWeight: true,
          tolerance: true,
          entryPrice: true,
          initialQuantity: true,
          currentQuantity: true,
          asset: { select: { id: true, symbol: true, name: true, exchange: true, currency: true } },
        },
      },
    },
  });
  if (!p) return res.status(404).json({ error: "Portfolio not found" });
  const typed = p as unknown as PortfolioDetail;

  return res.json({
    portfolio: {
      ...typed,
      initialInvestAmount: decToNumber(typed.initialInvestAmount),
      items: typed.items.map((it) => ({
        ...it,
        targetWeight: decToNumber(it.targetWeight),
        tolerance: it.tolerance ? decToNumber(it.tolerance) : null,
        entryPrice: decToNumber(it.entryPrice),
        initialQuantity: decToNumber(it.initialQuantity),
        currentQuantity: decToNumber(it.currentQuantity),
      })),
    },
  });
});

portfoliosRouter.patch("/:id/items/:itemId", requireAuth, async (req, res) => {
  const paramsParsed = z.object({ id: z.string().min(1), itemId: z.string().min(1) }).safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: paramsParsed.error.flatten() });

  const bodyParsed = z
    .object({
      currentQuantity: z.number().nonnegative().optional(),
      tolerance: z.number().positive().nullable().optional(),
    })
    .refine((v) => v.currentQuantity != null || v.tolerance !== undefined, { message: "No fields to update" })
    .safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.flatten() });

  const owner = await prisma.portfolio.findFirst({
    where: { id: paramsParsed.data.id, userId: req.auth!.userId },
    select: { id: true },
  });
  if (!owner) return res.status(404).json({ error: "Portfolio not found" });

  try {
    const updated = await prisma.portfolioItem.update({
      where: { id: paramsParsed.data.itemId },
      data: {
        ...(bodyParsed.data.currentQuantity != null ? { currentQuantity: toDecimal(bodyParsed.data.currentQuantity) } : {}),
        ...(bodyParsed.data.tolerance !== undefined
          ? { tolerance: bodyParsed.data.tolerance === null ? null : toDecimal(bodyParsed.data.tolerance) }
          : {}),
      },
      select: {
        id: true,
        targetWeight: true,
        tolerance: true,
        entryPrice: true,
        initialQuantity: true,
        currentQuantity: true,
      },
    });
    return res.json({
      item: {
        ...updated,
        targetWeight: decToNumber(updated.targetWeight),
        tolerance: updated.tolerance ? decToNumber(updated.tolerance) : null,
        entryPrice: decToNumber(updated.entryPrice),
        initialQuantity: decToNumber(updated.initialQuantity),
        currentQuantity: decToNumber(updated.currentQuantity),
      },
    });
  } catch {
    return res.status(404).json({ error: "Item not found" });
  }
});

portfoliosRouter.post("/:id/refresh", requireAuth, async (req, res) => {
  const parsed = z.object({ id: z.string().min(1) }).safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const p = await prisma.portfolio.findFirst({
    where: { id: parsed.data.id, userId: req.auth!.userId },
    select: {
      id: true,
      name: true,
      items: {
        select: {
          id: true,
          targetWeight: true,
          tolerance: true,
          currentQuantity: true,
          asset: { select: { symbol: true, name: true } },
        },
      },
    },
  });
  if (!p) return res.status(404).json({ error: "Portfolio not found" });
  const typed = p as unknown as PortfolioRefresh;

  const quotes = await Promise.all(
    typed.items.map(async (it) => {
      const q = await quoteSymbol(it.asset.symbol);
      return { itemId: it.id, symbol: it.asset.symbol, name: it.asset.name ?? q.name, quote: q };
    }),
  );

  const itemValues = typed.items.map((it) => {
    const q = quotes.find((x) => x.itemId === it.id)!.quote;
    const value = decToNumber(it.currentQuantity) * q.price;
    return { it, quote: q, value };
  });
  const totalValue = itemValues.reduce((acc, x) => acc + x.value, 0);

  const items = itemValues.map(({ it, quote, value }) => {
    const currentWeight = totalValue > 0 ? (value / totalValue) * 100 : 0;
    const targetWeight = decToNumber(it.targetWeight);
    const diff = currentWeight - targetWeight;
    const tolerance = it.tolerance ? decToNumber(it.tolerance) : null;
    const lower = tolerance != null ? targetWeight - tolerance : null;
    const upper = tolerance != null ? targetWeight + tolerance : null;
    const outOfRange = tolerance != null ? currentWeight < lower! || currentWeight > upper! : false;

    return {
      id: it.id,
      symbol: quote.symbol,
      name: it.asset.name ?? quote.name ?? quote.symbol,
      latestPrice: quote.price,
      currentQuantity: decToNumber(it.currentQuantity),
      value,
      targetWeight,
      currentWeight,
      diff,
      tolerance,
      bounds: tolerance != null ? { lower, upper } : null,
      outOfRange,
    };
  });

  return res.json({ totalValue, items });
});


