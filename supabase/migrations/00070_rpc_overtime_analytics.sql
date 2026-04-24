CREATE OR REPLACE FUNCTION rpc_overtime_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH ot_data AS (
    SELECT otr.id, otr.profile_id, otr.status, otr.total_hours, otr.date, otr.created_at,
      ed.department_id, d.name AS department_name
    FROM overtime_requests otr
    JOIN employee_details ed ON ed.profile_id = otr.profile_id
    LEFT JOIN departments d ON d.id = ed.department_id
    WHERE otr.company_id = p_company_id AND otr.date BETWEEN p_date_from AND p_date_to
  ),
  summary AS (
    SELECT
      COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) AS total_hours,
      COUNT(*) AS total_requests,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS approval_rate
    FROM ot_data
  ),
  dept_distribution AS (
    SELECT department_name AS name, COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) AS hours, COUNT(*) AS requests
    FROM ot_data WHERE department_name IS NOT NULL GROUP BY department_name ORDER BY hours DESC
  ),
  monthly_trend AS (
    SELECT to_char(date, 'YYYY-MM') AS month, COALESCE(SUM(total_hours) FILTER (WHERE status = 'approved'), 0) AS hours, COUNT(*) AS requests
    FROM ot_data GROUP BY to_char(date, 'YYYY-MM') ORDER BY month
  )
  SELECT jsonb_build_object(
    'total_hours', (SELECT total_hours FROM summary),
    'total_requests', (SELECT total_requests FROM summary),
    'approval_rate', (SELECT approval_rate FROM summary),
    'top_department', (SELECT name FROM dept_distribution LIMIT 1),
    'dept_distribution', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'hours', hours, 'requests', requests)) FROM dept_distribution), '[]'::jsonb),
    'monthly_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', month, 'hours', hours, 'requests', requests)) FROM monthly_trend), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
