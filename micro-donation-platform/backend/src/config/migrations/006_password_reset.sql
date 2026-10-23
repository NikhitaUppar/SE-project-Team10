-- Apply to the existing database. No dependency on the unmerged Issue #5 migration.
BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_token_unique ON public.password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_index ON public.password_reset_tokens (user_id);

CREATE OR REPLACE FUNCTION public.issue_password_reset_token(p_user_id uuid, p_token_hash text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  issued_at timestamptz;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid reset digest';
  END IF;
  -- Consistent user-first locking serializes issuance and password changes.
  PERFORM 1 FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF EXISTS (SELECT 1 FROM public.password_reset_tokens
    WHERE user_id = p_user_id AND created_at > clock_timestamp() - interval '1 minute') THEN
    RETURN 'throttled';
  END IF;
  DELETE FROM public.password_reset_tokens WHERE user_id = p_user_id;
  -- token stores only a SHA-256 digest. The backend emails the raw secret.
  issued_at := clock_timestamp();
  INSERT INTO public.password_reset_tokens (user_id, token, created_at, expires_at)
    VALUES (p_user_id, p_token_hash, issued_at, issued_at + interval '1 hour');
  RETURN 'created';
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_password_with_token(p_token_hash text, p_password_hash text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  target_user uuid;
  token_expiry timestamptz;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN RETURN 'invalid'; END IF;
  IF p_password_hash IS NULL OR p_password_hash !~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$' THEN
    RAISE EXCEPTION 'Invalid password hash';
  END IF;
  SELECT user_id INTO target_user FROM public.password_reset_tokens WHERE token = p_token_hash;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  PERFORM 1 FROM public.users WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  -- Recheck after the lock: another request may have consumed/replaced the link.
  SELECT expires_at INTO token_expiry FROM public.password_reset_tokens
    WHERE token = p_token_hash AND user_id = target_user;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF token_expiry <= clock_timestamp() THEN RETURN 'expired'; END IF;
  UPDATE public.users SET password_hash = p_password_hash, auth_version = auth_version + 1 WHERE id = target_user;
  DELETE FROM public.password_reset_tokens WHERE user_id = target_user;
  RETURN 'reset';
END;
$$;

REVOKE ALL ON public.password_reset_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_tokens TO service_role;
REVOKE ALL ON FUNCTION public.issue_password_reset_token(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_password_with_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_password_reset_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_password_with_token(text, text) TO service_role;

COMMIT;
