import { getNonWorkingDays } from "@/lib/actions/non-working-days";
import { NonWorkingDaysTable } from "@/components/attendance/non-working-days-table";

export default async function AttendanceSettingsPage() {
  const days = await getNonWorkingDays();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Attendance Settings</h1>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Non-Working Days</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Holidays and non-working days. Employees will not be marked absent on these dates.
        </p>
        <NonWorkingDaysTable days={days} />
      </div>
    </div>
  );
}
