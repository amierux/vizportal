-- Add leadership FKs now that profiles table exists
ALTER TABLE companies
  ADD COLUMN business_manager_id UUID REFERENCES profiles(id),
  ADD COLUMN director_id UUID REFERENCES profiles(id);
