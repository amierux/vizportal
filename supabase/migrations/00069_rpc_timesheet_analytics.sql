CREATE OR REPLACE FUNCTION rpc_timesheet_analytics(
  p_company_id UUID,
  p_week_start DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH submissions AS (
    SELECT ts.profile_id, ts.status, ts.total_minutes, ed.department_id, d.name AS department_name
    FROM timesheet_submissions ts
    JOIN employee_details ed ON ed.profile_id = ts.profile_id
    LEFT JOIN departments d ON d.id = ed.department_id
    WHERE ts.company_id = p_company_id AND ts.week_start = p_week_start
  ),
  total_employees AS (
    SELECT COUNT(*) AS count FROM employee_details WHERE company_id = p_company_id
  ),
  summary AS (
    SELECT
      COUNT(*) AS submitted_count,
      ROUND(AVG(total_minutes)::NUMERIC / 60, 1) AS avg_hours,
      COUNT(*) FILTER (WHERE total_minutes > 2400) AS overtime_flags
    FROM submissions
  ),
  dept_utilization AS (
    SELECT department_name AS name, COUNT(*) AS submitted, ROUND(AVG(total_minutes)::NUMERIC / 60, 1) AS avg_hours
    FROM submissions WHERE department_name IS NOT NULL GROUP BY department_name
  )
  SELECT jsonb_build_object(
    'submitted_count', (SELECT submitted_count FROM summary),
    'total_employees', (SELECT count FROM total_employees),
    'submission_rate', CASE WHEN (SELECT count FROM total_employees) > 0
      THEN ROUND((SELECT submitted_count FROM summary)::NUMERIC / (SELECT count FROM total_employees) * 100, 1)
      ELSE 0 END,
    'avg_hours', (SELECT avg_hours FROM summary),
    'overtime_flags', (SELECT overtime_flags FROM summary),
    'non_submitters', (SELECT count FROM total_employees) - (SELECT submitted_count FROM summary),
    'dept_utilization', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'submitted', submitted, 'avg_hours', avg_hours)) FROM dept_utilization), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
