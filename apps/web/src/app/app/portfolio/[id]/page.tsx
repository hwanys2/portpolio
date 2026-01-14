"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function fmtPct(n: number) {
  return `${n.toFixed(2)}%`;
}

export default function PortfolioDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, loading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: detail, error: detailError, isLoading: detailLoading, mutate: mutateDetail } = useSWR(
    user ? ["portfolio", id] : null,
    () => api.getPortfolio(id),
  );

  const { data: refreshData, error: refreshError, isLoading: refreshLoading, mutate: mutateRefresh } = useSWR(
    user ? ["refresh", id] : null,
    () => api.refreshPortfolio(id),
  );

  const rows = useMemo(() => {
    if (refreshData?.items?.length) return refreshData.items;
    return [];
  }, [refreshData]);

  if (loading) return <div className="text-sm text-zinc-600">loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  if (detailLoading) return <div className="text-sm text-zinc-600">로딩 중...</div>;
  if (detailError) return <div className="text-sm text-red-700">불러오기 실패: {String((detailError as any)?.error ?? detailError)}</div>;

  const p = detail!.portfolio;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">초기 투자금: {p.initialInvestAmount.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await mutateRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {refreshing || refreshLoading ? "새로고침 중..." : "새로고침(가격 업데이트)"}
          </button>
          <button className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => router.push("/app")}>
            목록
          </button>
        </div>
      </div>

      {refreshError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          새로고침 실패: {String((refreshError as any)?.error ?? refreshError)}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-medium">목표 vs 현재</div>
          <div className="text-sm text-zinc-600">총 평가금액: {(refreshData?.totalValue ?? 0).toLocaleString()}</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">종목</th>
                <th className="px-4 py-3 text-right font-medium">목표</th>
                <th className="px-4 py-3 text-right font-medium">현재</th>
                <th className="px-4 py-3 text-right font-medium">차이</th>
                <th className="px-4 py-3 text-right font-medium">허용오차</th>
                <th className="px-4 py-3 text-right font-medium">현재가</th>
                <th className="px-4 py-3 text-right font-medium">수량</th>
                <th className="px-4 py-3 text-right font-medium">평가금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length ? (
                rows.map((r) => {
                  const warn = r.outOfRange;
                  return (
                    <tr key={r.id} className={warn ? "bg-red-50" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.symbol}</div>
                        <div className="text-xs text-zinc-500">{r.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtPct(r.targetWeight)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtPct(r.currentWeight)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${r.diff > 0 ? "text-emerald-700" : r.diff < 0 ? "text-rose-700" : ""}`}>
                        {fmtPct(r.diff)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.tolerance != null ? (
                          <span className={warn ? "font-semibold text-red-700" : ""}>
                            ±{r.tolerance.toFixed(2)}% ({r.bounds!.lower.toFixed(2)}~{r.bounds!.upper.toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.latestPrice.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <input
                          className="w-32 rounded-lg border border-zinc-200 px-2 py-1 text-right outline-none focus:border-zinc-400"
                          type="number"
                          step="any"
                          defaultValue={r.currentQuantity}
                          onBlur={async (e) => {
                            const v = Number(e.target.value);
                            if (!Number.isFinite(v) || v < 0) return;
                            await api.updateItem(id, r.id, { currentQuantity: v });
                            await mutateRefresh();
                            await mutateDetail();
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.value.toLocaleString()}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-600" colSpan={8}>
                    새로고침을 눌러 최신 가격 기준 계산을 가져오세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-medium">생성 시점 정보</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {p.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{it.asset.symbol}</div>
                <div className="text-xs text-zinc-500">entry_price: {it.entryPrice.toLocaleString()}</div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                initial_qty: {it.initialQuantity}
                <div>target: {fmtPct(it.targetWeight)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


