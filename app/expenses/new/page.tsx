import { Suspense } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Screen from "@/components/layout/Screen";
import NewExpenseForm from "./NewExpenseForm";

/**
 * A server component wrapping the form, purely so useSearchParams (for
 * ?from=<id>) has a Suspense boundary above it. Without one, the whole client
 * tree up to the nearest boundary opts out of prerendering — see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md.
 * This way the heading and shell still prerender.
 */
export default function NewExpensePage() {
  return (
    <Screen>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-[26px] font-bold leading-tight text-text">เพิ่มรายจ่าย</h1>
        <Link href="/expenses/import" className="shrink-0 text-[14px] font-semibold text-accent">
          เพิ่มจากสลิป
        </Link>
      </div>
      <Suspense
        fallback={
          <Card className="rounded-[22px] p-[22px]">
            <p className="text-sm text-sub">กำลังโหลด...</p>
          </Card>
        }
      >
        <NewExpenseForm />
      </Suspense>
    </Screen>
  );
}
