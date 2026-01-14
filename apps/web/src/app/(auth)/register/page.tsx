"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">회원가입</h1>
        <p className="mt-1 text-sm text-zinc-600">개인별 포트폴리오 데이터를 안전하게 분리합니다.</p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (password !== password2) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
          }
          setLoading(true);
          try {
            const res = await api.register(email, password);
            setToken(res.token);
            await refresh();
            router.push("/app");
          } catch (e: any) {
            setError(e?.error ?? "회원가입에 실패했습니다.");
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
          비밀번호 (8자 이상)
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
          />
        </label>
        <label className="text-sm font-medium">
          비밀번호 확인
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type="password"
            required
          />
        </label>

        {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{String(error)}</div> : null}

        <button
          disabled={loading}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <div className="text-sm text-zinc-600">
        이미 계정이 있나요?{" "}
        <Link className="font-medium text-zinc-900 underline" href="/login">
          로그인
        </Link>
      </div>
    </div>
  );
}


