"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type DraftItem = {
  symbol: string;
  name?: string;
  targetWeight: number;
  tolerance?: number;
};

export default function NewPortfolioPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [initialInvestAmount, setInitialInvestAmount] = useState<number>(1000000);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: searchData, isLoading: searching } = useSWR(
    user && query.trim().length >= 2 ? ["search", query.trim()] : null,
    () => api.searchAssets(query.trim()),
  );

  const totalWeight = useMemo(() => items.reduce((acc, it) => acc + (Number(it.targetWeight) || 0), 0), [items]);

  if (loading) return <div className="text-sm text-zinc-600">loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">새 포트폴리오</h1>
        <p className="mt-1 text-sm text-zinc-600">생성 시점 현재가로 entry_price를 고정하고 초기 수량을 자동 계산합니다.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm font-medium">
          포트폴리오 이름
          <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          총 투자금액
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            value={initialInvestAmount}
            onChange={(e) => setInitialInvestAmount(Number(e.target.value))}
            type="number"
            min={1}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-medium">종목 추가</div>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="티커/종목 검색 (예: AAPL, TSLA, 005930.KS)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-2 text-xs text-zinc-500">{searching ? "검색 중..." : "2글자 이상 입력하면 검색됩니다."}</div>
        </div>

        {searchData?.results?.length ? (
          <div className="max-h-64 overflow-auto">
            {searchData.results.map((r) => {
              const already = items.some((x) => x.symbol === r.symbol);
              return (
                <button
                  key={r.symbol}
                  disabled={already}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 disabled:opacity-50"
                  onClick={() => {
                    setItems((prev) => [...prev, { symbol: r.symbol, name: r.name, targetWeight: 0, tolerance: 3 }]);
                    setQuery("");
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.symbol}</div>
                    <div className="truncate text-xs text-zinc-500">{r.name ?? ""}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{already ? "추가됨" : "추가"}</div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-medium">목표 비중 설정</div>
          <div className={`text-sm ${Math.abs(totalWeight - 100) < 0.0001 ? "text-green-700" : "text-zinc-600"}`}>
            합계: {totalWeight.toFixed(2)}%
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-600">먼저 종목을 추가하세요.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((it, idx) => (
              <div key={it.symbol} className="grid gap-3 px-4 py-4 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <div className="font-medium">{it.symbol}</div>
                  <div className="text-xs text-zinc-500">{it.name ?? ""}</div>
                </div>

                <label className="md:col-span-3 text-sm">
                  목표비중(%)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.targetWeight}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, targetWeight: v } : x)));
                    }}
                  />
                </label>

                <label className="md:col-span-3 text-sm">
                  허용오차(±%)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.tolerance ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, tolerance: v } : x)));
                    }}
                  />
                </label>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                    onClick={() => setItems((prev) => prev.filter((x) => x.symbol !== it.symbol))}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex items-center justify-end gap-3">
        <button className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => router.push("/app")}>
          취소
        </button>
        <button
          disabled={submitting || !name.trim() || items.length === 0}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              const payload = {
                name: name.trim(),
                initialInvestAmount: Number(initialInvestAmount),
                items: items.map((x) => ({
                  symbol: x.symbol,
                  targetWeight: Number(x.targetWeight),
                  tolerance: x.tolerance != null ? Number(x.tolerance) : undefined,
                })),
              };
              const res = await api.createPortfolio(payload);
              router.push(`/app/portfolio/${res.portfolio.id}`);
            } catch (e: any) {
              setError(String(e?.error ?? "생성에 실패했습니다."));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "생성 중..." : "생성"}
        </button>
      </div>
    </div>
  );
}


