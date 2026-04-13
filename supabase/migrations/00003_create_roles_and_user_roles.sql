CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE(company_id, name)
);

CREATE INDEX idx_roles_company_id ON roles(company_id);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(profile_id, role_id)
);

CREATE INDEX idx_user_roles_profile_id ON user_roles(profile_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
