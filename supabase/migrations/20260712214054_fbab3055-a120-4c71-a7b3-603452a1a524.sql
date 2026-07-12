
-- 1) Ensure roles are seeded whenever a tenant is created
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.on_tenant_created();

-- 2) Make handle_new_user robust: seed roles inline before assigning owner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  betrieb TEXT;
  owner_role_id UUID;
BEGIN
  betrieb := COALESCE(NEW.raw_user_meta_data->>'betrieb', 'Mein Betrieb');
  INSERT INTO public.tenants(name) VALUES (betrieb) RETURNING id INTO new_tenant_id;
  INSERT INTO public.profiles(id, tenant_id, full_name)
    VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Defensive: ensure default roles exist for this tenant
  PERFORM public.seed_default_roles(new_tenant_id);

  SELECT id INTO owner_role_id FROM public.roles
    WHERE tenant_id = new_tenant_id AND key = 'unternehmensinhaber';
  IF owner_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments(user_id, role_id, tenant_id)
      VALUES (NEW.id, owner_role_id, new_tenant_id)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Backfill: any existing user with a profile but no role assignment
--    becomes Unternehmensinhaber of their tenant (they signed up themselves).
INSERT INTO public.user_role_assignments (user_id, role_id, tenant_id)
SELECT p.id, r.id, p.tenant_id
FROM public.profiles p
JOIN public.roles r ON r.tenant_id = p.tenant_id AND r.key = 'unternehmensinhaber'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_role_assignments ura WHERE ura.user_id = p.id
)
ON CONFLICT DO NOTHING;
