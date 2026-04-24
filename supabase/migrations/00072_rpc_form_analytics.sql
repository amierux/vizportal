CREATE OR REPLACE FUNCTION rpc_form_analytics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH form_data AS (
    SELECT
      f.id, f.title, f.status AS form_status,
      COUNT(fa.id) AS total_assigned,
      COUNT(fs.id) AS total_submitted,
      COUNT(fa.id) FILTER (WHERE fa.status = 'pending') AS pending_count
    FROM forms f
    LEFT JOIN form_assignments fa ON fa.form_id = f.id
    LEFT JOIN form_submissions fs ON fs.form_id = f.id AND fs.profile_id = fa.profile_id
    WHERE f.company_id = p_company_id
    GROUP BY f.id, f.title, f.status
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE form_status = 'active') AS active_count,
      COALESCE(SUM(pending_count), 0) AS total_pending,
      CASE WHEN SUM(total_assigned) > 0
        THEN ROUND(SUM(total_submitted)::NUMERIC / SUM(total_assigned) * 100, 1)
        ELSE 0
      END AS response_rate
    FROM form_data
  ),
  per_form AS (
    SELECT title, total_assigned, total_submitted,
      CASE WHEN total_assigned > 0
        THEN ROUND(total_submitted::NUMERIC / total_assigned * 100, 1)
        ELSE 0
      END AS submission_rate
    FROM form_data WHERE form_status = 'active' ORDER BY submission_rate ASC LIMIT 10
  )
  SELECT jsonb_build_object(
    'active_count', (SELECT active_count FROM summary),
    'total_pending', (SELECT total_pending FROM summary),
    'response_rate', (SELECT response_rate FROM summary),
    'per_form', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'title', title, 'assigned', total_assigned, 'submitted', total_submitted, 'rate', submission_rate
    )) FROM per_form), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
