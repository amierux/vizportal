CREATE OR REPLACE FUNCTION rpc_employee_analytics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH emp_data AS (
    SELECT
      ed.profile_id, ed.department_id, ed.job_level_id, ed.employment_status, ed.hire_date,
      d.name AS department_name, jl.name AS job_level_name
    FROM employee_details ed
    LEFT JOIN departments d ON d.id = ed.department_id
    LEFT JOIN job_levels jl ON jl.id = ed.job_level_id
    WHERE ed.company_id = p_company_id
  ),
  summary AS (
    SELECT
      COUNT(*) AS headcount,
      COUNT(*) FILTER (WHERE hire_date >= date_trunc('month', CURRENT_DATE)) AS new_hires_month,
      COUNT(*) FILTER (WHERE employment_status = 'probationary') AS probationary_count,
      CASE WHEN COUNT(*) FILTER (WHERE hire_date IS NOT NULL) > 0
        THEN ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, hire_date))) FILTER (WHERE hire_date IS NOT NULL)::NUMERIC, 1)
        ELSE 0
      END AS avg_tenure_years
    FROM emp_data
  ),
  dept_breakdown AS (
    SELECT department_name AS name, COUNT(*) AS count FROM emp_data WHERE department_name IS NOT NULL GROUP BY department_name ORDER BY count DESC
  ),
  level_breakdown AS (
    SELECT job_level_name AS name, COUNT(*) AS count FROM emp_data WHERE job_level_name IS NOT NULL GROUP BY job_level_name ORDER BY count DESC
  ),
  status_breakdown AS (
    SELECT employment_status AS status, COUNT(*) AS count FROM emp_data WHERE employment_status IS NOT NULL GROUP BY employment_status
  )
  SELECT jsonb_build_object(
    'headcount', (SELECT headcount FROM summary),
    'new_hires_month', (SELECT new_hires_month FROM summary),
    'probationary_count', (SELECT probationary_count FROM summary),
    'avg_tenure_years', (SELECT avg_tenure_years FROM summary),
    'dept_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count)) FROM dept_breakdown), '[]'::jsonb),
    'level_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count)) FROM level_breakdown), '[]'::jsonb),
    'status_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', status, 'count', count)) FROM status_breakdown), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
