"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AppHome() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(user ? "portfolios" : null, () => api.listPortfolios());

  if (loading) return <div className="text-sm text-zinc-600">loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">내 포트폴리오</h1>
          <p className="mt-1 text-sm text-zinc-600">목표 비중 vs 현재 비중을 한눈에 확인하세요.</p>
        </div>
        <Link
          href="/app/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          새 포트폴리오
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          불러오기 실패: {String((error as any)?.error ?? error)}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-medium">목록</div>
          <button className="text-sm text-zinc-600 hover:text-zinc-900" onClick={() => mutate()}>
            새로고침
          </button>
        </div>
        <div className="divide-y divide-zinc-100">
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-zinc-600">로딩 중...</div>
          ) : data?.portfolios?.length ? (
            data.portfolios.map((p) => (
              <Link key={p.id} href={`/app/portfolio/${p.id}`} className="block px-4 py-4 hover:bg-zinc-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">초기 투자금: {p.initialInvestAmount.toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-zinc-600">아직 포트폴리오가 없어요. “새 포트폴리오”를 만들어보세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}


