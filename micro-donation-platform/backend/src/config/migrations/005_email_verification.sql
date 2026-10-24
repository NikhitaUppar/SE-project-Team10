-- Run after schema.sql for new databases, or once on the existing Supabase database.
-- Tokens in email_tokens.token are SHA-256 digests, never the emailed secret.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS email_tokens_token_unique ON public.email_tokens (token);
CREATE INDEX IF NOT EXISTS email_tokens_user_id_index ON public.email_tokens (user_id);

CREATE OR REPLACE FUNCTION public.issue_email_verification_token(p_user_id uuid, p_token_hash text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  verified boolean;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid verification digest';
  END IF;
  -- Both functions lock the user first, serializing resends and verification.
  SELECT is_verified INTO verified FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF verified IS TRUE THEN RETURN 'already_verified'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.email_tokens
    WHERE user_id = p_user_id AND created_at > clock_timestamp() - interval '1 minute'
  ) THEN RETURN 'throttled'; END IF;

  DELETE FROM public.email_tokens WHERE user_id = p_user_id;
  INSERT INTO public.email_tokens (user_id, token, expires_at)
    VALUES (p_user_id, p_token_hash, clock_timestamp() + interval '24 hours');
  RETURN 'created';
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_email_token(p_token_hash text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  target_user uuid;
  verified boolean;
  token_expiry timestamptz;
BEGIN
  SELECT user_id INTO target_user FROM public.email_tokens WHERE token = p_token_hash;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  SELECT is_verified INTO verified FROM public.users WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;

  -- Recheck after taking the lock: a concurrent request may have consumed it.
  SELECT expires_at INTO token_expiry FROM public.email_tokens
    WHERE token = p_token_hash AND user_id = target_user;
  IF NOT FOUND THEN RETURN 'invalid'; END IF;
  IF token_expiry <= clock_timestamp() THEN RETURN 'expired'; END IF;
  IF verified IS TRUE THEN
    DELETE FROM public.email_tokens WHERE user_id = target_user;
    RETURN 'already_verified';
  END IF;

  UPDATE public.users SET is_verified = true WHERE id = target_user;
  DELETE FROM public.email_tokens WHERE user_id = target_user;
  RETURN 'verified';
END;
$$;

-- Only the backend service role may access token digests or call these functions.
REVOKE ALL ON public.email_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_tokens TO service_role;
REVOKE ALL ON FUNCTION public.issue_email_verification_token(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_email_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_email_verification_token(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_email_token(text) TO service_role;

COMMIT;
