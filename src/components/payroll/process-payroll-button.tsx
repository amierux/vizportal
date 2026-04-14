import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Play, ArrowRight } from "lucide-react";

type ProcessPayrollButtonProps = { hasActivePeriod: boolean };

export function ProcessPayrollButton({ hasActivePeriod }: ProcessPayrollButtonProps) {
  return (
    <Link href="/payroll/process" className={cn(buttonVariants())}>
      {hasActivePeriod ? (
        <>
          <ArrowRight className="mr-2 h-4 w-4" />
          Continue Processing
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Process Payroll
        </>
      )}
    </Link>
  );
}
