CREATE OR REPLACE FUNCTION rpc_workspace_analytics(
  p_company_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_folder_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH task_data AS (
    SELECT
      wt.id, wt.assignee_id, wt.created_at, wt.completed_at, wt.target_end_date, wt.priority,
      wfs.is_done, wfs.name AS status_name, wl.folder_id,
      p.first_name || ' ' || p.last_name AS assignee_name
    FROM workspace_tasks wt
    LEFT JOIN workspace_folder_statuses wfs ON wfs.id = wt.status_id
    LEFT JOIN workspace_lists wl ON wl.id = wt.list_id
    LEFT JOIN profiles p ON p.id = wt.assignee_id
    WHERE wt.company_id = p_company_id
      AND (p_folder_id IS NULL OR wl.folder_id = p_folder_id)
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE is_done = true) AS completed,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE target_end_date < CURRENT_DATE AND is_done IS DISTINCT FROM true) AS overdue,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE is_done = true)::NUMERIC / COUNT(*) * 100, 1)
        ELSE 0
      END AS completion_rate
    FROM task_data
  ),
  workload AS (
    SELECT assignee_name AS name, COUNT(*) AS total, COUNT(*) FILTER (WHERE is_done = true) AS completed
    FROM task_data WHERE assignee_id IS NOT NULL GROUP BY assignee_name ORDER BY total DESC LIMIT 15
  ),
  priority_pipeline AS (
    SELECT priority, COUNT(*) AS count, COUNT(*) FILTER (WHERE is_done = true) AS completed
    FROM task_data GROUP BY priority
  )
  SELECT jsonb_build_object(
    'completed', (SELECT completed FROM summary),
    'total', (SELECT total FROM summary),
    'overdue', (SELECT overdue FROM summary),
    'completion_rate', (SELECT completion_rate FROM summary),
    'workload', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'total', total, 'completed', completed)) FROM workload), '[]'::jsonb),
    'priority_pipeline', COALESCE((SELECT jsonb_agg(jsonb_build_object('priority', priority, 'count', count, 'completed', completed)) FROM priority_pipeline), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
