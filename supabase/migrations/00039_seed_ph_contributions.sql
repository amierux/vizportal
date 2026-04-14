-- 2025 SSS Contribution Table (simplified brackets)
INSERT INTO ph_contribution_tables (type, salary_from, salary_to, employee_share, employer_share, effective_year) VALUES
  ('sss', 0, 4250, 180, 390, 2025),
  ('sss', 4250, 4750, 202.50, 427.50, 2025),
  ('sss', 4750, 5250, 225, 465, 2025),
  ('sss', 5250, 5750, 247.50, 502.50, 2025),
  ('sss', 5750, 6250, 270, 540, 2025),
  ('sss', 6250, 6750, 292.50, 577.50, 2025),
  ('sss', 6750, 7250, 315, 615, 2025),
  ('sss', 7250, 7750, 337.50, 652.50, 2025),
  ('sss', 7750, 8250, 360, 690, 2025),
  ('sss', 8250, 8750, 382.50, 727.50, 2025),
  ('sss', 8750, 9250, 405, 765, 2025),
  ('sss', 9250, 9750, 427.50, 802.50, 2025),
  ('sss', 9750, 10250, 450, 840, 2025),
  ('sss', 10250, 10750, 472.50, 877.50, 2025),
  ('sss', 10750, 11250, 495, 915, 2025),
  ('sss', 11250, 11750, 517.50, 952.50, 2025),
  ('sss', 11750, 12250, 540, 990, 2025),
  ('sss', 12250, 12750, 562.50, 1027.50, 2025),
  ('sss', 12750, 13250, 585, 1065, 2025),
  ('sss', 13250, 13750, 607.50, 1102.50, 2025),
  ('sss', 13750, 14250, 630, 1140, 2025),
  ('sss', 14250, 14750, 652.50, 1177.50, 2025),
  ('sss', 14750, 15250, 675, 1215, 2025),
  ('sss', 15250, 15750, 697.50, 1252.50, 2025),
  ('sss', 15750, 16250, 720, 1290, 2025),
  ('sss', 16250, 16750, 742.50, 1327.50, 2025),
  ('sss', 16750, 17250, 765, 1365, 2025),
  ('sss', 17250, 17750, 787.50, 1402.50, 2025),
  ('sss', 17750, 18250, 810, 1440, 2025),
  ('sss', 18250, 18750, 832.50, 1477.50, 2025),
  ('sss', 18750, 19250, 855, 1515, 2025),
  ('sss', 19250, 19750, 877.50, 1552.50, 2025),
  ('sss', 19750, 20250, 900, 1590, 2025),
  ('sss', 20250, 20750, 900, 1590, 2025),
  ('sss', 20750, 99999999, 900, 1590, 2025);

-- 2025 PhilHealth (5% of basic, split 50/50, cap at 5000 monthly salary)
INSERT INTO ph_contribution_tables (type, salary_from, salary_to, employee_share, employer_share, effective_year) VALUES
  ('philhealth', 0, 10000, 250, 250, 2025),
  ('philhealth', 10000, 100000, 0, 0, 2025),
  ('philhealth', 100000, 99999999, 2500, 2500, 2025);

-- 2025 Pag-IBIG
INSERT INTO ph_contribution_tables (type, salary_from, salary_to, employee_share, employer_share, effective_year) VALUES
  ('pagibig', 0, 1500, 15, 30, 2025),
  ('pagibig', 1500, 5000, 50, 100, 2025),
  ('pagibig', 5000, 99999999, 200, 200, 2025);

-- 2025 BIR TRAIN Law Monthly Tax Brackets
INSERT INTO ph_tax_brackets (compensation_from, compensation_to, tax_rate, base_tax, frequency, effective_year) VALUES
  (0, 20833, 0, 0, 'monthly', 2025),
  (20833, 33333, 0.15, 0, 'monthly', 2025),
  (33333, 66667, 0.20, 1875, 'monthly', 2025),
  (66667, 166667, 0.25, 8541.80, 'monthly', 2025),
  (166667, 666667, 0.30, 33541.80, 'monthly', 2025),
  (666667, 999999999, 0.35, 183541.80, 'monthly', 2025);

-- Semi-monthly brackets (monthly / 2)
INSERT INTO ph_tax_brackets (compensation_from, compensation_to, tax_rate, base_tax, frequency, effective_year) VALUES
  (0, 10417, 0, 0, 'semi_monthly', 2025),
  (10417, 16667, 0.15, 0, 'semi_monthly', 2025),
  (16667, 33333, 0.20, 937.50, 'semi_monthly', 2025),
  (33333, 83333, 0.25, 4270.90, 'semi_monthly', 2025),
  (83333, 333333, 0.30, 16770.90, 'semi_monthly', 2025),
  (333333, 999999999, 0.35, 91770.90, 'semi_monthly', 2025);

-- Weekly brackets (monthly / 4.33)
INSERT INTO ph_tax_brackets (compensation_from, compensation_to, tax_rate, base_tax, frequency, effective_year) VALUES
  (0, 4808, 0, 0, 'weekly', 2025),
  (4808, 7692, 0.15, 0, 'weekly', 2025),
  (7692, 15385, 0.20, 432.69, 'weekly', 2025),
  (15385, 38462, 0.25, 1971.15, 'weekly', 2025),
  (38462, 153846, 0.30, 7740.38, 'weekly', 2025),
  (153846, 999999999, 0.35, 42355.77, 'weekly', 2025);
