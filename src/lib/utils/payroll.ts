/**
 * Payroll computation utilities for PH-compliant payroll.
 */

export function calculateDailyRate(monthlySalary: number, workingDaysPerMonth: number): number {
  if (workingDaysPerMonth <= 0) return 0;
  return Math.round((monthlySalary / workingDaysPerMonth) * 100) / 100;
}

export function calculateHourlyRate(dailyRate: number, hoursPerDay: number): number {
  if (hoursPerDay <= 0) return 0;
  return Math.round((dailyRate / hoursPerDay) * 100) / 100;
}

export function calculateOtPay(hours: number, hourlyRate: number, multiplier: number): number {
  return Math.round(hours * hourlyRate * multiplier * 100) / 100;
}

export function calculateLateDeduction(lateMinutes: number, hourlyRate: number): number {
  return Math.round((lateMinutes / 60) * hourlyRate * 100) / 100;
}

export function calculateUndertimeDeduction(undertimeMinutes: number, hourlyRate: number): number {
  return Math.round((undertimeMinutes / 60) * hourlyRate * 100) / 100;
}

export function calculateAbsentDeduction(daysAbsent: number, dailyRate: number): number {
  return Math.round(daysAbsent * dailyRate * 100) / 100;
}

export function calculateBasicPay(monthlySalary: number, scheduleType: string): number {
  switch (scheduleType) {
    case "semi_monthly":
      return Math.round((monthlySalary / 2) * 100) / 100;
    case "weekly":
      return Math.round((monthlySalary / 4.33) * 100) / 100;
    case "monthly":
    default:
      return monthlySalary;
  }
}

/**
 * Look up SSS contribution from bracket table.
 */
export function lookupSssContribution(
  monthlySalary: number,
  brackets: { salary_from: number; salary_to: number; employee_share: number; employer_share: number }[]
): { employee: number; employer: number } {
  for (const bracket of brackets) {
    if (monthlySalary >= bracket.salary_from && monthlySalary < bracket.salary_to) {
      return { employee: bracket.employee_share, employer: bracket.employer_share };
    }
  }
  // Default to last bracket
  const last = brackets[brackets.length - 1];
  return last ? { employee: last.employee_share, employer: last.employer_share } : { employee: 0, employer: 0 };
}

/**
 * Calculate PhilHealth contribution (2025: 5% of salary, split 50/50, min 500 total, max 5000).
 */
export function calculatePhilhealthContribution(monthlySalary: number): { employee: number; employer: number } {
  const total = monthlySalary * 0.05;
  const clamped = Math.max(500, Math.min(total, 5000));
  const share = Math.round((clamped / 2) * 100) / 100;
  return { employee: share, employer: share };
}

/**
 * Look up Pag-IBIG contribution from bracket table.
 */
export function lookupPagibigContribution(
  monthlySalary: number,
  brackets: { salary_from: number; salary_to: number; employee_share: number; employer_share: number }[]
): { employee: number; employer: number } {
  for (const bracket of brackets) {
    if (monthlySalary >= bracket.salary_from && monthlySalary < bracket.salary_to) {
      return { employee: bracket.employee_share, employer: bracket.employer_share };
    }
  }
  const last = brackets[brackets.length - 1];
  return last ? { employee: last.employee_share, employer: last.employer_share } : { employee: 0, employer: 0 };
}

/**
 * Calculate withholding tax using BIR TRAIN law brackets.
 */
export function calculateWithholdingTax(
  taxableIncome: number,
  brackets: { compensation_from: number; compensation_to: number; tax_rate: number; base_tax: number }[]
): number {
  for (const bracket of brackets) {
    if (taxableIncome >= bracket.compensation_from && taxableIncome < bracket.compensation_to) {
      const excess = taxableIncome - bracket.compensation_from;
      return Math.round((bracket.base_tax + excess * bracket.tax_rate) * 100) / 100;
    }
  }
  return 0;
}

/**
 * Format Philippine Peso.
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}
