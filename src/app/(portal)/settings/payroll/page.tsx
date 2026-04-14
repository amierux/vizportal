import { getPayrollSettings, getCustomDeductionTypes } from "@/lib/actions/payroll-settings";
import { getContributionTables, getTaxBrackets } from "@/lib/actions/contribution-tables";
import { PayrollSettingsForm } from "@/components/settings/payroll-settings-form";
import { CustomDeductionTypesTable } from "@/components/settings/custom-deduction-types-table";
import { ContributionTablesEditor } from "@/components/settings/contribution-tables-editor";

export default async function PayrollSettingsPage() {
  const [settings, deductionTypes, sssBrackets, philhealthBrackets, pagibigBrackets, taxBrackets] =
    await Promise.all([
      getPayrollSettings(),
      getCustomDeductionTypes(),
      getContributionTables("sss", 2025),
      getContributionTables("philhealth", 2025),
      getContributionTables("pagibig", 2025),
      getTaxBrackets("monthly", 2025),
    ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in-up">
      <h1 className="text-2xl font-bold">Payroll Settings</h1>
      <PayrollSettingsForm settings={settings} />
      <CustomDeductionTypesTable types={deductionTypes} />
      <ContributionTablesEditor
        sssBrackets={sssBrackets}
        philhealthBrackets={philhealthBrackets}
        pagibigBrackets={pagibigBrackets}
        taxBrackets={taxBrackets}
      />
    </div>
  );
}
