DO $$
BEGIN
  IF to_regclass('public.sepay_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Cho phép webhook insert giao dịch" ON public.sepay_transactions;
    REVOKE INSERT ON TABLE public.sepay_transactions FROM anon;
    REVOKE INSERT ON TABLE public.sepay_transactions FROM authenticated;
  END IF;
END $$;
