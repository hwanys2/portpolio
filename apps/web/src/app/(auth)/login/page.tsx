"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">로그인</h1>
        <p className="mt-1 text-sm text-zinc-600">포트폴리오 목표비중 추적을 시작하세요.</p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const res = await api.login(email, password);
            setToken(res.token);
            await refresh();
            router.push("/app");
          } catch (e: any) {
            setError(e?.error ?? "로그인에 실패했습니다.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="text-sm font-medium">
          이메일
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="text-sm font-medium">
          비밀번호
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>

        {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{String(error)}</div> : null}

        <button
          disabled={loading}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="text-sm text-zinc-600">
        계정이 없나요?{" "}
        <Link className="font-medium text-zinc-900 underline" href="/register">
          회원가입
        </Link>
      </div>
    </div>
  );
}


