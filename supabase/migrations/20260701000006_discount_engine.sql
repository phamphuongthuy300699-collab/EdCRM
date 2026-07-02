-- 1. Create discount_types table
CREATE TABLE IF NOT EXISTS public.discount_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  percent numeric(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  kind text NOT NULL,
  is_one_time boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

-- 2. Create discount_assignments table
CREATE TABLE IF NOT EXISTS public.discount_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  discount_type_id uuid NOT NULL REFERENCES public.discount_types(id) ON DELETE CASCADE,
  guardian_id uuid REFERENCES public.guardians(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create invoice_discounts table
CREATE TABLE IF NOT EXISTS public.invoice_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  discount_assignment_id uuid REFERENCES public.discount_assignments(id) ON DELETE SET NULL,
  title text NOT NULL,
  percent numeric(5,2) NOT NULL,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, discount_assignment_id)
);

-- 4. Add discount columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_title text,
ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0;

-- 5. Seed default discount types for organization 'a3848a60-a292-491a-85eb-7f2824cf4e77'
INSERT INTO public.discount_types (organization_id, code, title, percent, kind, is_one_time, is_active)
VALUES
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'svo', 'Скидка СВО', 10.00, 'svo', false, true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'large_family', 'Многодетная семья', 10.00, 'large_family', false, true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'family_multi', 'Семейная скидка (несколько детей)', 10.00, 'family_multi', false, true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'referral', 'Приведи друга', 25.00, 'referral', true, true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'first_group', 'Первые из первых', 5.00, 'first_group', false, true)
ON CONFLICT (organization_id, code) DO UPDATE SET
  title = excluded.title,
  percent = excluded.percent,
  kind = excluded.kind,
  is_one_time = excluded.is_one_time,
  is_active = excluded.is_active;

-- 6. Enable RLS on new tables
ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_discounts ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies

-- discount_types
CREATE POLICY "discount_types_select_public" ON public.discount_types
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "discount_types_all_staff" ON public.discount_types
  FOR ALL TO authenticated USING (
    public.has_org_role(organization_id, ARRAY['owner','admin','manager','accountant']::public.app_role[])
  ) WITH CHECK (
    public.has_org_role(organization_id, ARRAY['owner','admin','manager','accountant']::public.app_role[])
  );

-- discount_assignments
CREATE POLICY "discount_assignments_select_guardian" ON public.discount_assignments
  FOR SELECT TO authenticated USING (
    exists (
      select 1 from public.guardian_users gu
      where gu.user_id = auth.uid()
        and gu.organization_id = discount_assignments.organization_id
        and gu.guardian_id = discount_assignments.guardian_id
    )
  );

CREATE POLICY "discount_assignments_all_staff" ON public.discount_assignments
  FOR ALL TO authenticated USING (
    public.has_org_role(organization_id, ARRAY['owner','admin','manager','accountant']::public.app_role[])
  ) WITH CHECK (
    public.has_org_role(organization_id, ARRAY['owner','admin','manager','accountant']::public.app_role[])
  );

-- invoice_discounts
CREATE POLICY "invoice_discounts_select_guardian" ON public.invoice_discounts
  FOR SELECT TO authenticated USING (
    exists (
      select 1 from public.invoices inv
      where inv.id = invoice_discounts.invoice_id
    )
  );

CREATE POLICY "invoice_discounts_all_staff" ON public.invoice_discounts
  FOR ALL TO authenticated USING (
    public.has_org_role(organization_id, ARRAY['owner','admin','manager','accountant']::public.app_role[])
  ) WITH CHECK (
    public.has_org_role(organization_id, ARRAY['owner','admin','manager','accountant']::public.app_role[])
  );
