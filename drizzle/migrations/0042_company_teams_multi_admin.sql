-- Company teams: multiple admins per company with request/approval flow

CREATE TABLE public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_admin_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.recruiter_profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.company_admin_requests TO authenticated;
GRANT ALL ON public.company_admin_requests TO service_role;
ALTER TABLE public.company_admin_requests ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX company_admin_requests_one_pending ON public.company_admin_requests (company_id, user_id) WHERE status = 'pending';

-- Helper functions (not callable by signed-out visitors)
CREATE OR REPLACE FUNCTION public.is_company_member(_company uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _uid)
$$;
CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _uid AND role = 'admin')
$$;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid, uuid) FROM anon;

-- Membership policies: members read their company team; only admins change membership
CREATE POLICY "Members read company team" ON public.company_members
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "Admins add members" ON public.company_members
  FOR INSERT TO authenticated WITH CHECK (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins update members" ON public.company_members
  FOR UPDATE TO authenticated USING (public.is_company_admin(company_id, auth.uid())) WITH CHECK (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins remove members" ON public.company_members
  FOR DELETE TO authenticated USING (public.is_company_admin(company_id, auth.uid()));

-- Request policies: member manages own request; company admins review
CREATE POLICY "Read own or company requests" ON public.company_admin_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "Members request admin access" ON public.company_admin_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_company_member(company_id, auth.uid()));
CREATE POLICY "Admins resolve requests" ON public.company_admin_requests
  FOR UPDATE TO authenticated USING (public.is_company_admin(company_id, auth.uid())) WITH CHECK (public.is_company_admin(company_id, auth.uid()));

-- Backfill: company creators become admins; recruiters linked to a company become members
INSERT INTO public.company_members (company_id, user_id, role)
SELECT c.company_id, c.created_by, 'admin' FROM public.companies c
ON CONFLICT (company_id, user_id) DO NOTHING;
INSERT INTO public.company_members (company_id, user_id, role)
SELECT rp.company_id, rp.user_id, 'member' FROM public.recruiter_profiles rp
WHERE rp.company_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Last-admin protection on membership changes
CREATE OR REPLACE FUNCTION public.company_members_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admins int;
BEGIN
  SELECT count(*) INTO admins FROM public.company_members WHERE company_id = OLD.company_id AND role = 'admin';
  IF OLD.role = 'admin' AND admins <= 1 THEN
    RAISE EXCEPTION 'A company needs at least one admin. Promote another member first.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER company_members_guard BEFORE DELETE OR UPDATE OF role ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.company_members_guard();

-- Keep membership in sync when a recruiter links or switches their company
CREATE OR REPLACE FUNCTION public.sync_company_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.company_id IS NOT NULL AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    DELETE FROM public.company_members WHERE company_id = OLD.company_id AND user_id = NEW.user_id;
  END IF;
  IF NEW.company_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (NEW.company_id, NEW.user_id,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = NEW.company_id) THEN 'admin' ELSE 'member' END)
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER recruiter_company_sync AFTER INSERT OR UPDATE OF company_id ON public.recruiter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_company_membership();

-- Requests: notify admins on new request; approve promotes to admin; resolve notifies requester
CREATE OR REPLACE FUNCTION public.company_admin_request_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; cname text; rname text;
BEGIN
  SELECT company_name INTO cname FROM public.companies WHERE company_id = NEW.company_id;
  rname := public.person_name(NEW.user_id);
  FOR a IN SELECT user_id FROM public.company_members WHERE company_id = NEW.company_id AND role = 'admin' LOOP
    PERFORM public.create_notification(a.user_id, 'recruiter', 'company_admin_request', 'company',
      'Admin access requested', rname || ' requested admin access to ' || cname || '.',
      '/recruiter/company', 'medium', 'company-admin-req-' || NEW.request_id);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER company_admin_request_notify AFTER INSERT ON public.company_admin_requests
  FOR EACH ROW EXECUTE FUNCTION public.company_admin_request_notify();

CREATE OR REPLACE FUNCTION public.company_admin_request_resolve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cname text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'denied') THEN
    SELECT company_name INTO cname FROM public.companies WHERE company_id = NEW.company_id;
    IF NEW.status = 'approved' THEN
      INSERT INTO public.company_members (company_id, user_id, role) VALUES (NEW.company_id, NEW.user_id, 'admin')
      ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'admin', updated_at = now();
      PERFORM public.create_notification(NEW.user_id, 'recruiter', 'company_admin_approved', 'company',
        'Admin access approved', 'You are now an admin of ' || cname || '.',
        '/recruiter/company', 'high', 'company-admin-res-' || NEW.request_id);
    ELSE
      PERFORM public.create_notification(NEW.user_id, 'recruiter', 'company_admin_denied', 'company',
        'Admin request declined', 'Your admin request for ' || cname || ' was declined.',
        '/recruiter/company', 'medium', 'company-admin-res-' || NEW.request_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER company_admin_request_resolve AFTER UPDATE OF status ON public.company_admin_requests
  FOR EACH ROW EXECUTE FUNCTION public.company_admin_request_resolve();

-- Replace creator-only policies with admin-based ones
DROP POLICY "Creators update companies" ON public.companies;
CREATE POLICY "Admins update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()))
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));

DROP POLICY "Read companies with active jobs or own company" ON public.companies;
CREATE POLICY "Read companies with active jobs or membership" ON public.companies
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_company_member(company_id, auth.uid())
    OR EXISTS (SELECT 1 FROM jobs j WHERE j.company_id = companies.company_id AND j.job_status = 'active'));

DROP POLICY "Creator inserts company contact" ON public.company_contacts;
CREATE POLICY "Admins insert company contact" ON public.company_contacts
  FOR INSERT TO authenticated WITH CHECK (public.is_company_admin(company_id, auth.uid()));
DROP POLICY "Creator updates company contact" ON public.company_contacts;
CREATE POLICY "Admins update company contact" ON public.company_contacts
  FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()))
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));

COMMENT ON COLUMN public.companies.created_by IS 'Company creator; editing is governed by company_members admins.';