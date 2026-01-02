-- Drop existing policies on order_items table
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;

-- Recreate as PERMISSIVE policies with explicit auth checks
CREATE POLICY "Users can view their own order items"
ON public.order_items
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create order items for their orders"
ON public.order_items
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all order items"
ON public.order_items
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all order items"
ON public.order_items
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));