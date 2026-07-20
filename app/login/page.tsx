"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <div className="flex justify-end px-[26px] pt-[26px]">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-[26px] pb-16">
        <Card className="w-full rounded-[22px] p-[26px]">
          <h1 className="mb-6 text-center text-[26px] font-bold text-text">รายจ่ายรายวัน</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="รหัสผ่าน"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            {error && <p className="text-sm text-accent">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-1.5 w-full">
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
