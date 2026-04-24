CREATE OR REPLACE FUNCTION rpc_approval_analytics(
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
  WITH approval_data AS (
    SELECT
      ar.id, ar.status, ar.created_at, ar.updated_at,
      EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at)) / 3600 AS hours_to_resolve
    FROM approval_requests ar
    WHERE ar.company_id = p_company_id AND ar.created_at::date BETWEEN p_date_from AND p_date_to
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      ROUND(AVG(hours_to_resolve) FILTER (WHERE status IN ('approved', 'rejected'))::NUMERIC, 1) AS avg_hours_to_resolve,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
      MAX(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600) FILTER (WHERE status = 'pending') AS oldest_pending_hours
    FROM approval_data
  ),
  pending_by_step AS (
    SELECT p.first_name || ' ' || p.last_name AS approver_name, COUNT(*) AS pending_count
    FROM approval_steps aps
    JOIN approval_requests ar ON ar.id = aps.request_id
    JOIN profiles p ON p.id = aps.approver_id
    WHERE ar.company_id = p_company_id AND aps.status = 'pending'
    GROUP BY approver_name ORDER BY pending_count DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'pending_count', (SELECT COALESCE(pending_count, 0) FROM summary),
    'avg_hours_to_resolve', (SELECT COALESCE(avg_hours_to_resolve, 0) FROM summary),
    'approved_count', (SELECT COALESCE(approved_count, 0) FROM summary),
    'rejected_count', (SELECT COALESCE(rejected_count, 0) FROM summary),
    'oldest_pending_hours', (SELECT COALESCE(ROUND(oldest_pending_hours::NUMERIC, 1), 0) FROM summary),
    'bottlenecks', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', approver_name, 'pending', pending_count)) FROM pending_by_step), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
