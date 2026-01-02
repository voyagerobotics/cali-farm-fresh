-- Drop existing policies on orders table
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Recreate with explicit auth.uid() IS NOT NULL checks
CREATE POLICY "Users can view their own orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all orders"
ON public.orders
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));