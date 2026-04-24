import { getPayrollEntry } from "@/lib/actions/payroll";
import { PayrollEntryForm } from "@/components/payroll/payroll-entry-form";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatFullName, formatDate } from "@/lib/utils/format";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ entryId: string }> };

export default async function PayrollEntryPage({ params }: PageProps) {
  const { entryId } = await params;
  const entry = await getPayrollEntry(entryId);

  if (!entry) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyEntry = entry as any;
  const profile = anyEntry.profiles ?? {};
  const period = anyEntry.payroll_periods ?? {};
  const name = formatFullName(
    (profile as { first_name?: string | null }).first_name ?? null,
    (profile as { last_name?: string | null }).last_name ?? null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/payroll/process"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-muted-foreground text-sm">
            Pay period:{" "}
            {formatDate(
              (period as { start_date?: string | null }).start_date ?? null
            )}{" "}
            –{" "}
            {formatDate(
              (period as { end_date?: string | null }).end_date ?? null
            )}
          </p>
        </div>
      </div>

      <Separator />

      <PayrollEntryForm entry={anyEntry} />
    </div>
  );
}
