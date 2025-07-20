"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // ルートページにアクセスした場合、テーブル一覧ページに自動遷移
    router.push("/tables");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-xl">テーブル一覧に遷移中...</div>
    </div>
  );
}
