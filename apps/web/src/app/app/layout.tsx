"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setToken } from "@/lib/api";

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" className="font-semibold tracking-tight">
            Portfolio Tracker
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-zinc-500">loading...</span>
            ) : user ? (
              <>
                <span className="text-zinc-600">{user.email}</span>
                <button
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50"
                  onClick={() => {
                    setToken(null);
                    logout();
                    router.push("/login");
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50" onClick={() => router.push("/login")}>
                로그인
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}


