
CREATE OR REPLACE FUNCTION public.get_preorder_queue_position(p_pre_order_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT position::integer FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY product_name
      ORDER BY created_at ASC
    ) as position
    FROM public.pre_orders
    WHERE status IN ('pending', 'confirmed')
  ) ranked
  WHERE ranked.id = p_pre_order_id;
$$;
