"use server";

import { createClient } from "@/lib/supabase/server";
import {
  calculateBasicPay,
  calculateDailyRate,
  calculateHourlyRate,
  calculateOtPay,
  calculateLateDeduction,
  calculateUndertimeDeduction,
  calculateAbsentDeduction,
  lookupSssContribution,
  calculatePhilhealthContribution,
  lookupPagibigContribution,
  calculateWithholdingTax,
} from "@/lib/utils/payroll";

/**
 * Compute payroll entries for all active employees in a period.
 */
export async function computePayrollForPeriod(periodId: string, companyId: string) {
  const supabase = await createClient();

  // Get period
  const { data: period } = await supabase
    .from("payroll_periods")
    .select("start_date, end_date")
    .eq("id", periodId)
    .single();
  if (!period) return;

  // Get payroll settings
  const { data: settings } = await supabase
    .from("payroll_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();

  const scheduleType = settings?.schedule_type ?? "semi_monthly";
  const enableLate = settings?.enable_late_deduction ?? true;
  const enableUndertime = settings?.enable_undertime_deduction ?? true;
  const enableAbsent = settings?.enable_absent_deduction ?? true;
  const otRegMult = settings?.ot_regular_multiplier ?? 1.25;
  const otRestMult = settings?.ot_rest_day_multiplier ?? 1.30;
  const otHolidayMult = settings?.ot_holiday_multiplier ?? 2.00;

  // Get contribution tables
  const { data: sssBrackets } = await supabase
    .from("ph_contribution_tables")
    .select("salary_from, salary_to, employee_share, employer_share")
    .eq("type", "sss")
    .eq("effective_year", 2025)
    .order("salary_from");

  const { data: pagibigBrackets } = await supabase
    .from("ph_contribution_tables")
    .select("salary_from, salary_to, employee_share, employer_share")
    .eq("type", "pagibig")
    .eq("effective_year", 2025)
    .order("salary_from");

  const { data: taxBrackets } = await supabase
    .from("ph_tax_brackets")
    .select("compensation_from, compensation_to, tax_rate, base_tax")
    .eq("frequency", scheduleType)
    .eq("effective_year", 2025)
    .order("compensation_from");

  // Get non-working days in period
  const { data: nonWorkingDays } = await supabase
    .from("non_working_days")
    .select("date, is_recurring")
    .eq("company_id", companyId);

  // Get all active employees with schedules
  const { data: employees } = await supabase
    .from("profiles")
    .select(`
      id,
      employee_details(salary, department_id,
        employee_schedules:employee_schedules(start_time, end_time, work_days)
      )
    `)
    .eq("company_id", companyId)
    .eq("is_active", true);

  for (const emp of employees ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = (emp as any).employee_details;
    if (!details) continue;

    const empDetails = Array.isArray(details) ? details[0] : details;
    const monthlySalary = empDetails?.salary ?? 0;
    if (monthlySalary <= 0) continue;

    const schedule = Array.isArray(empDetails?.employee_schedules)
      ? empDetails.employee_schedules[0]
      : empDetails?.employee_schedules;

    const workDays = schedule?.work_days ?? ["mon", "tue", "wed", "thu", "fri"];
    const startTime = schedule?.start_time ?? "08:00";
    const endTime = schedule?.end_time ?? "17:00";

    // Calculate rates
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    const hoursPerDay = (eH + eM / 60) - (sH + sM / 60);
    const workingDaysPerMonth = workDays.length * 4.33;

    const dailyRate = calculateDailyRate(monthlySalary, workingDaysPerMonth);
    const hourlyRate = calculateHourlyRate(dailyRate, hoursPerDay);
    const basicPay = calculateBasicPay(monthlySalary, scheduleType);

    // Get attendance summaries for period
    const { data: attendanceSummaries } = await supabase
      .from("daily_attendance_summary")
      .select("*")
      .eq("profile_id", emp.id)
      .gte("date", period.start_date)
      .lte("date", period.end_date);

    let daysWorked = 0;
    let daysAbsent = 0;
    let daysLate = 0;
    let lateMinutesTotal = 0;
    let undertimeMinutesTotal = 0;

    for (const summary of attendanceSummaries ?? []) {
      if (summary.status === "present" || summary.status === "late") daysWorked++;
      if (summary.status === "absent") daysAbsent++;
      if (summary.is_late) {
        daysLate++;
        lateMinutesTotal += summary.late_minutes;
      }
      undertimeMinutesTotal += summary.undertime_minutes;
    }

    // Get approved leave in period
    const { data: leaves } = await supabase
      .from("leave_requests")
      .select("total_days, leave_types(is_paid)")
      .eq("profile_id", emp.id)
      .eq("status", "approved")
      .lte("start_date", period.end_date)
      .gte("end_date", period.start_date);

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    for (const leave of leaves ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isPaid = (leave as any).leave_types?.is_paid ?? true;
      if (isPaid) paidLeaveDays += leave.total_days;
      else unpaidLeaveDays += leave.total_days;
    }

    // Get approved overtime in period
    const { data: overtimeReqs } = await supabase
      .from("overtime_requests")
      .select("total_hours, date")
      .eq("profile_id", emp.id)
      .eq("status", "approved")
      .gte("date", period.start_date)
      .lte("date", period.end_date);

    let otRegularHours = 0;
    let otRestDayHours = 0;
    let otHolidayHours = 0;

    const dayMap: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };

    for (const ot of overtimeReqs ?? []) {
      const otDate = new Date(ot.date);
      const otDayName = dayMap[otDate.getDay()];

      // Check if holiday
      const isHoliday = (nonWorkingDays ?? []).some((nwd) => {
        if (!nwd.is_recurring) return nwd.date === ot.date;
        const nwdDate = new Date(nwd.date);
        return nwdDate.getMonth() === otDate.getMonth() && nwdDate.getDate() === otDate.getDate();
      });

      if (isHoliday) {
        otHolidayHours += ot.total_hours;
      } else if (!workDays.includes(otDayName)) {
        otRestDayHours += ot.total_hours;
      } else {
        otRegularHours += ot.total_hours;
      }
    }

    // Count holiday pay days (non-working days that fall on employee's work days in the period)
    let holidayPayDays = 0;
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);
    const current = new Date(periodStart);
    while (current <= periodEnd) {
      const dateStr = current.toISOString().split("T")[0];
      const dayName = dayMap[current.getDay()];
      if (workDays.includes(dayName)) {
        const isHoliday = (nonWorkingDays ?? []).some((nwd) => {
          if (!nwd.is_recurring) return nwd.date === dateStr;
          const nwdDate = new Date(nwd.date);
          return nwdDate.getMonth() === current.getMonth() && nwdDate.getDate() === current.getDate();
        });
        if (isHoliday) holidayPayDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Calculate pay components
    const otPay = calculateOtPay(otRegularHours, hourlyRate, otRegMult)
      + calculateOtPay(otRestDayHours, hourlyRate, otRestMult)
      + calculateOtPay(otHolidayHours, hourlyRate, otHolidayMult);
    const holidayPay = holidayPayDays * dailyRate;
    const lateDeduction = enableLate ? calculateLateDeduction(lateMinutesTotal, hourlyRate) : 0;
    const undertimeDeduction = enableUndertime ? calculateUndertimeDeduction(undertimeMinutesTotal, hourlyRate) : 0;
    const absentDeduction = enableAbsent ? calculateAbsentDeduction(daysAbsent, dailyRate) : 0;
    const unpaidLeaveDeduction = unpaidLeaveDays * dailyRate;

    const grossPay = Math.round((basicPay + otPay + holidayPay - lateDeduction - undertimeDeduction - absentDeduction - unpaidLeaveDeduction) * 100) / 100;

    // Statutory deductions (based on monthly salary, not period pay)
    const sss = lookupSssContribution(monthlySalary, sssBrackets ?? []);
    const philhealth = calculatePhilhealthContribution(monthlySalary);
    const pagibig = lookupPagibigContribution(monthlySalary, pagibigBrackets ?? []);

    // For semi-monthly: split statutory deductions across 2 periods
    const divisor = scheduleType === "semi_monthly" ? 2 : scheduleType === "weekly" ? 4.33 : 1;
    const sssContribution = Math.round((sss.employee / divisor) * 100) / 100;
    const philhealthContribution = Math.round((philhealth.employee / divisor) * 100) / 100;
    const pagibigContribution = Math.round((pagibig.employee / divisor) * 100) / 100;

    // Withholding tax
    const taxableIncome = grossPay - sssContribution - philhealthContribution - pagibigContribution;
    const withholdingTax = calculateWithholdingTax(Math.max(0, taxableIncome), taxBrackets ?? []);

    // Recurring deductions
    const { data: recurringDeds } = await supabase
      .from("recurring_deductions")
      .select("amount")
      .eq("profile_id", emp.id)
      .eq("is_active", true)
      .lte("start_date", period.end_date)
      .or(`end_date.is.null,end_date.gte.${period.start_date}`);

    let customDeductionsTotal = 0;
    for (const rd of recurringDeds ?? []) {
      customDeductionsTotal += rd.amount;
    }

    const totalDeductions = Math.round((sssContribution + philhealthContribution + pagibigContribution + withholdingTax + customDeductionsTotal) * 100) / 100;
    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    // Fields allowed in Update (excludes immutable FK/rate columns per DB schema)
    const updateableFields = {
      days_worked: daysWorked,
      days_absent: daysAbsent,
      days_late: daysLate,
      late_minutes_total: lateMinutesTotal,
      undertime_minutes_total: undertimeMinutesTotal,
      ot_regular_hours: otRegularHours,
      ot_rest_day_hours: otRestDayHours,
      ot_holiday_hours: otHolidayHours,
      paid_leave_days: paidLeaveDays,
      unpaid_leave_days: unpaidLeaveDays,
      holiday_pay_days: holidayPayDays,
      basic_pay: basicPay,
      ot_pay: otPay,
      holiday_pay: holidayPay,
      late_deduction: lateDeduction,
      undertime_deduction: undertimeDeduction,
      absent_deduction: absentDeduction,
      unpaid_leave_deduction: unpaidLeaveDeduction,
      gross_pay: grossPay,
      sss_contribution: sssContribution,
      philhealth_contribution: philhealthContribution,
      pagibig_contribution: pagibigContribution,
      withholding_tax: withholdingTax,
      custom_deductions_total: customDeductionsTotal,
      total_deductions: totalDeductions,
      net_pay: netPay,
    };

    const { data: existingEntry } = await supabase
      .from("payroll_entries")
      .select("id")
      .eq("payroll_period_id", periodId)
      .eq("profile_id", emp.id)
      .single();

    if (existingEntry) {
      await supabase
        .from("payroll_entries")
        .update(updateableFields)
        .eq("id", existingEntry.id);
    } else {
      await supabase
        .from("payroll_entries")
        .insert({
          payroll_period_id: periodId,
          profile_id: emp.id,
          company_id: companyId,
          basic_salary: monthlySalary,
          daily_rate: dailyRate,
          hourly_rate: hourlyRate,
          ...updateableFields,
        });
    }

    // Insert recurring deductions as custom deductions on the entry
    if (customDeductionsTotal > 0) {
      const { data: newEntry } = await supabase
        .from("payroll_entries")
        .select("id")
        .eq("payroll_period_id", periodId)
        .eq("profile_id", emp.id)
        .single();

      if (newEntry) {
        // Clear old auto-generated recurring deductions
        await supabase
          .from("payroll_custom_deductions")
          .delete()
          .eq("payroll_entry_id", newEntry.id)
          .like("notes", "Auto: recurring%");

        for (const rd of recurringDeds ?? []) {
          await supabase.from("payroll_custom_deductions").insert({
            payroll_entry_id: newEntry.id,
            name: "Recurring Deduction",
            type: "deduction" as const,
            amount: rd.amount,
            notes: "Auto: recurring deduction",
          });
        }
      }
    }
  }
}
