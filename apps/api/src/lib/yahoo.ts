import yahooFinance from "yahoo-finance2";

export type YahooQuote = {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  price: number;
};

export async function quoteSymbol(symbol: string): Promise<YahooQuote> {
  const q: any = await yahooFinance.quote(symbol);
  const price = q?.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price)) {
    throw new Error(`No regularMarketPrice for symbol: ${symbol}`);
  }
  return {
    symbol: q?.symbol ?? symbol,
    name: q?.shortName ?? q?.longName ?? undefined,
    exchange: q?.fullExchangeName ?? q?.exchange ?? undefined,
    currency: q?.currency ?? undefined,
    price,
  };
}

export async function searchSymbols(query: string) {
  const res: any = await yahooFinance.search(query);
  const quotes: any[] = Array.isArray(res?.quotes) ? res.quotes : [];
  return quotes
    .filter((q) => typeof q?.symbol === "string" && q.symbol.length > 0)
    .slice(0, 20)
    .map((q) => ({
      symbol: q.symbol as string,
      name: (q.shortname ?? q.longname ?? q.name) as string | undefined,
      exchange: (q.exchDisp ?? q.exchange) as string | undefined,
      type: q.quoteType as string | undefined,
    }));
}


