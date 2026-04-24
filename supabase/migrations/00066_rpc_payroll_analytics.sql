CREATE OR REPLACE FUNCTION rpc_payroll_analytics(
  p_company_id UUID,
  p_period_count INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH recent_periods AS (
    SELECT id, period_start, period_end, pay_date
    FROM payroll_periods
    WHERE company_id = p_company_id
    ORDER BY period_start DESC
    LIMIT p_period_count
  ),
  latest_period AS (
    SELECT id FROM recent_periods ORDER BY period_start DESC LIMIT 1
  ),
  period_totals AS (
    SELECT
      pp.period_start,
      COALESCE(SUM(pe.gross_pay), 0) AS total_gross,
      COALESCE(SUM(pe.net_pay), 0) AS total_net,
      COALESCE(SUM(pe.total_deductions), 0) AS total_deductions,
      COUNT(pe.id) AS employee_count
    FROM recent_periods pp
    LEFT JOIN payroll_entries pe ON pe.payroll_period_id = pp.id
    GROUP BY pp.period_start
    ORDER BY pp.period_start
  ),
  current_period_stats AS (
    SELECT
      COALESCE(SUM(pe.gross_pay), 0) AS total_gross,
      COALESCE(SUM(pe.net_pay), 0) AS total_net,
      COALESCE(SUM(pe.total_deductions), 0) AS total_deductions,
      COUNT(pe.id) AS employee_count,
      CASE WHEN COUNT(pe.id) > 0
        THEN ROUND(SUM(pe.net_pay)::NUMERIC / COUNT(pe.id), 2)
        ELSE 0
      END AS avg_salary
    FROM payroll_entries pe
    WHERE pe.payroll_period_id = (SELECT id FROM latest_period)
  ),
  dept_costs AS (
    SELECT
      d.name AS department,
      COALESCE(SUM(pe.net_pay), 0) AS net_pay,
      COUNT(pe.id) AS employee_count
    FROM payroll_entries pe
    JOIN employee_details ed ON ed.profile_id = pe.profile_id
    JOIN departments d ON d.id = ed.department_id
    WHERE pe.payroll_period_id = (SELECT id FROM latest_period)
    GROUP BY d.name
  )
  SELECT jsonb_build_object(
    'total_gross', (SELECT total_gross FROM current_period_stats),
    'total_net', (SELECT total_net FROM current_period_stats),
    'total_deductions', (SELECT total_deductions FROM current_period_stats),
    'employee_count', (SELECT employee_count FROM current_period_stats),
    'avg_salary', (SELECT avg_salary FROM current_period_stats),
    'period_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'period', period_start, 'gross', total_gross, 'net', total_net, 'deductions', total_deductions
    ) ORDER BY period_start) FROM period_totals), '[]'::jsonb),
    'dept_costs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'department', department, 'net_pay', net_pay, 'count', employee_count
    )) FROM dept_costs), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
