-- Migration: Welcome email trigger
-- Sends a welcome email when a user confirms their email or signs up via OAuth

-- Enable pg_net extension for making HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send welcome email via edge function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url TEXT := 'https://znjqpxlijraodmjrhqaz.supabase.co/functions/v1/send-welcome-email';
  service_role_key TEXT;
BEGIN
  -- Only send if email is confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- For UPDATEs, only send if email_confirmed_at just changed from NULL
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get service role key from vault (or use a stored secret)
  -- Note: In production, you might want to use Supabase Vault for this
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Make async HTTP request to edge function
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := jsonb_build_object(
      'user_id', NEW.id::text,
      'email', NEW.email
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;

CREATE TRIGGER on_user_email_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.send_welcome_email() IS 'Sends welcome email when user email is confirmed';
COMMENT ON TRIGGER on_user_email_confirmed ON auth.users IS 'Trigger to send welcome email after email confirmation';
