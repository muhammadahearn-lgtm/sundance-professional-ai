CREATE TABLE public.company_contacts (
  company_id uuid PRIMARY KEY REFERENCES public.companies(company_id) ON DELETE CASCADE,
  contact_email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.company_contacts TO authenticated;
GRANT ALL ON public.company_contacts TO service_role;
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters read company contacts" ON public.company_contacts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Creator inserts company contact" ON public.company_contacts
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.company_id = company_contacts.company_id AND c.created_by = auth.uid()));
CREATE POLICY "Creator updates company contact" ON public.company_contacts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.company_id = company_contacts.company_id AND c.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.company_id = company_contacts.company_id AND c.created_by = auth.uid()));

INSERT INTO public.company_contacts (company_id, contact_email)
SELECT company_id, contact_email FROM public.companies;

-- Move emails out of the widely readable companies table
UPDATE public.companies SET contact_email = '';
ALTER TABLE public.companies ALTER COLUMN contact_email SET DEFAULT '';
COMMENT ON COLUMN public.companies.contact_email IS 'DEPRECATED: moved to company_contacts (recruiters only)';

CREATE OR REPLACE FUNCTION public.companies_strip_contact()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.contact_email IS DISTINCT FROM '' THEN
    INSERT INTO public.company_contacts (company_id, contact_email) VALUES (NEW.company_id, NEW.contact_email)
    ON CONFLICT (company_id) DO UPDATE SET contact_email = EXCLUDED.contact_email, updated_at = now();
    NEW.contact_email := '';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER companies_strip_contact BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_strip_contact();
REVOKE EXECUTE ON FUNCTION public.companies_strip_contact() FROM PUBLIC, anon, authenticated;