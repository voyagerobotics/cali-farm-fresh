-- Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Recreate ORDERS policies as PERMISSIVE (so admin OR user conditions work)
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
USING ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id));

CREATE POLICY "Users can create their own orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
WITH CHECK ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id));

CREATE POLICY "Admins can view all orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
USING ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all orders"
ON public.orders
AS PERMISSIVE
FOR ALL
USING ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role));

-- Recreate ORDER_ITEMS policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

CREATE POLICY "Users can view their own order items"
ON public.order_items
AS PERMISSIVE
FOR SELECT
USING (
  (auth.uid() IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create order items for their orders"
ON public.order_items
AS PERMISSIVE
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all order items"
ON public.order_items
AS PERMISSIVE
FOR SELECT
USING ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all order items"
ON public.order_items
AS PERMISSIVE
FOR ALL
USING ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role));
