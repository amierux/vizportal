-- Fix infinite recursion between approval_requests and approval_steps RLS policies.
-- approval_requests "Approvers can view" → subselect approval_steps
-- approval_steps "System can manage" → subselect approval_requests → triggers above → loop
--
-- Solution: SECURITY DEFINER helper functions that bypass RLS for the cross-table lookups.

-- 1. Returns approval_request IDs where the current user is an approver.
CREATE OR REPLACE FUNCTION user_approver_request_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT approval_request_id FROM approval_steps WHERE approver_id = auth.uid();
$$;

-- 2. Returns approval_request IDs belonging to the current user's company.
CREATE OR REPLACE FUNCTION user_company_approval_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM approval_requests WHERE company_id = get_user_company_id();
$$;

-- 3. Returns approval_request IDs filed by the current user.
CREATE OR REPLACE FUNCTION user_own_approval_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM approval_requests WHERE requester_id = auth.uid();
$$;

-- Drop and recreate the offending policies on approval_requests
DROP POLICY IF EXISTS "Approvers can view assigned approval requests" ON approval_requests;
CREATE POLICY "Approvers can view assigned approval requests" ON approval_requests
  FOR SELECT USING (id IN (SELECT user_approver_request_ids()));

-- Drop and recreate the offending policies on approval_steps
DROP POLICY IF EXISTS "Admin/HR can view all approval steps" ON approval_steps;
CREATE POLICY "Admin/HR can view all approval steps" ON approval_steps
  FOR SELECT USING (
    approval_request_id IN (SELECT user_company_approval_ids())
    AND has_any_role(ARRAY['admin', 'hr'])
  );

DROP POLICY IF EXISTS "Requesters can view own request steps" ON approval_steps;
CREATE POLICY "Requesters can view own request steps" ON approval_steps
  FOR SELECT USING (approval_request_id IN (SELECT user_own_approval_ids()));

DROP POLICY IF EXISTS "System can manage approval steps" ON approval_steps;
CREATE POLICY "System can manage approval steps" ON approval_steps
  FOR ALL USING (approval_request_id IN (SELECT user_company_approval_ids()));
