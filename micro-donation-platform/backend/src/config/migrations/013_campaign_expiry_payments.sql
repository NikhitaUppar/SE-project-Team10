-- Apply once through Supabase SQL Editor before deploying issue #13.
-- No existing donation is deleted or relabelled. NULL means historical/unknown.
BEGIN;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS campaign_credited boolean;

-- If historical duplicate non-null order IDs exist, this fails without changing
-- data. Investigate those records rather than deleting/merging payments here.
CREATE UNIQUE INDEX IF NOT EXISTS donations_razorpay_order_unique
  ON public.donations (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.settle_campaign_payment(
  p_order_id text, p_payment_id text, p_donor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  donation public.donations%ROWTYPE;
  campaign public.campaigns%ROWTYPE;
  credited boolean := false;
BEGIN
  IF p_order_id IS NULL OR p_order_id = '' OR p_payment_id IS NULL OR p_payment_id = '' THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;
  SELECT * INTO donation FROM public.donations
    WHERE razorpay_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result', 'missing'); END IF;
  IF p_donor_id IS NOT NULL AND donation.donor_id IS DISTINCT FROM p_donor_id THEN
    RETURN jsonb_build_object('result', 'forbidden');
  END IF;
  IF donation.status = 'completed' THEN
    IF donation.razorpay_payment_id IS DISTINCT FROM p_payment_id THEN
      RETURN jsonb_build_object('result', 'conflict');
    END IF;
    RETURN jsonb_build_object('result', 'already_completed', 'credited', donation.campaign_credited);
  END IF;
  IF donation.status = 'refunded' THEN RETURN jsonb_build_object('result', 'conflict'); END IF;

  SELECT * INTO campaign FROM public.campaigns WHERE id = donation.campaign_id FOR UPDATE;
  -- Same strict boundary as expiry: exactly at deadline is still eligible.
  credited := FOUND AND campaign.status = 'active' AND campaign.deadline >= clock_timestamp();
  IF credited THEN
    UPDATE public.campaigns SET raised_amount = COALESCE(raised_amount, 0) + donation.amount
      WHERE id = campaign.id;
  END IF;
  -- A captured payment is a financial fact even after closure. Keep it in the
  -- ledger, explicitly uncredited, for administrator reconciliation/refund.
  UPDATE public.donations SET status = 'completed', razorpay_payment_id = p_payment_id,
    campaign_credited = credited WHERE id = donation.id;
  RETURN jsonb_build_object('result', 'completed', 'credited', credited);
END;
$$;
REVOKE ALL ON FUNCTION public.settle_campaign_payment(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_campaign_payment(text, text, uuid) TO service_role;
COMMIT;
