CREATE OR REPLACE FUNCTION rpc_attendance_analytics(
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
  attendance_data AS (
    SELECT
      das.date,
      das.status,
      das.is_late,
      fe.department_id
    FROM daily_attendance_summary das
    JOIN filtered_employees fe ON fe.profile_id = das.profile_id
    WHERE das.company_id = p_company_id
      AND das.date BETWEEN p_date_from AND p_date_to
  ),
  today_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'present') AS present_today,
      COUNT(*) FILTER (WHERE status = 'late') AS late_today,
      COUNT(*) FILTER (WHERE status IN ('absent', 'half_day')) AS absent_today,
      COUNT(*) AS total_today
    FROM attendance_data
    WHERE date = CURRENT_DATE
  ),
  month_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE is_late = true) AS late_count_month,
      COUNT(*) AS total_month,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('present', 'late'))::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS attendance_rate
    FROM attendance_data
  ),
  daily_trend AS (
    SELECT
      date,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE status IN ('present', 'late'))::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS rate
    FROM attendance_data
    GROUP BY date
    ORDER BY date
  ),
  dept_breakdown AS (
    SELECT
      d.name AS department,
      COUNT(*) FILTER (WHERE ad.status IN ('present', 'late')) AS present,
      COUNT(*) FILTER (WHERE ad.is_late = true) AS late,
      COUNT(*) AS total,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE ad.status IN ('present', 'late'))::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS attendance_rate,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE ad.is_late = true)::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS late_rate
    FROM attendance_data ad
    JOIN departments d ON d.id = ad.department_id
    GROUP BY d.name
  )
  SELECT jsonb_build_object(
    'present_today', (SELECT present_today FROM today_stats),
    'late_today', (SELECT late_today FROM today_stats),
    'absent_today', (SELECT absent_today FROM today_stats),
    'total_today', (SELECT total_today FROM today_stats),
    'late_count_month', (SELECT late_count_month FROM month_stats),
    'attendance_rate', (SELECT attendance_rate FROM month_stats),
    'daily_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'rate', rate)) FROM daily_trend), '[]'::jsonb),
    'dept_breakdown', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'department', department, 'attendance_rate', attendance_rate, 'late_rate', late_rate,
      'present', present, 'late', late, 'total', total
    )) FROM dept_breakdown), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
