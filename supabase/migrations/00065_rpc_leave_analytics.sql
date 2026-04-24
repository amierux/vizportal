CREATE OR REPLACE FUNCTION rpc_leave_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_department_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH filtered_employees AS (
    SELECT ed.profile_id, ed.department_id
    FROM employee_details ed
    WHERE ed.company_id = p_company_id
      AND (p_department_id IS NULL OR ed.department_id = p_department_id)
  ),
  leave_data AS (
    SELECT
      lr.id, lr.status, lr.total_days, lr.start_date, lr.end_date,
      lr.created_at, lr.leave_type_id, lt.name AS leave_type_name, fe.department_id
    FROM leave_requests lr
    JOIN filtered_employees fe ON fe.profile_id = lr.profile_id
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.start_date <= p_date_to AND lr.end_date >= p_date_from
  ),
  summary AS (
    SELECT
      COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) AS days_used,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count
    FROM leave_data
  ),
  usage_by_type AS (
    SELECT leave_type_name AS name, COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) AS days
    FROM leave_data GROUP BY leave_type_name
  ),
  balance_stats AS (
    SELECT
      COALESCE(SUM(lb.total_days), 0) AS total_allocated,
      COALESCE(SUM(lb.used_days), 0) AS total_used,
      COALESCE(SUM(lb.remaining_days), 0) AS total_remaining,
      CASE WHEN SUM(lb.total_days) > 0
        THEN ROUND(SUM(lb.used_days)::NUMERIC / SUM(lb.total_days) * 100, 1)
        ELSE 0
      END AS utilization_pct
    FROM leave_balances lb
    JOIN filtered_employees fe ON fe.profile_id = lb.profile_id
    WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  )
  SELECT jsonb_build_object(
    'days_used', (SELECT days_used FROM summary),
    'pending_count', (SELECT pending_count FROM summary),
    'approved_count', (SELECT approved_count FROM summary),
    'rejected_count', (SELECT rejected_count FROM summary),
    'utilization_pct', (SELECT utilization_pct FROM balance_stats),
    'total_allocated', (SELECT total_allocated FROM balance_stats),
    'total_remaining', (SELECT total_remaining FROM balance_stats),
    'usage_by_type', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'days', days)) FROM usage_by_type), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
