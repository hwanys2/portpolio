import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { quoteSymbol, searchSymbols } from "../lib/yahoo";

export const assetsRouter = Router();

assetsRouter.get("/search", requireAuth, async (req, res) => {
  const parsed = z.object({ q: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const results = await searchSymbols(parsed.data.q);
  return res.json({ results });
});

assetsRouter.get("/quote", requireAuth, async (req, res) => {
  const parsed = z.object({ symbol: z.string().min(1) }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const quote = await quoteSymbol(parsed.data.symbol);
    return res.json({ quote });
  } catch (e: any) {
    return res.status(404).json({ error: e?.message ?? "Quote not found" });
  }
});


