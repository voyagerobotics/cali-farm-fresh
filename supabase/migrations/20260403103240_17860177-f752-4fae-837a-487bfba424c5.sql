-- Attach the existing reduce_stock_after_order function to order_items table
CREATE TRIGGER reduce_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.reduce_stock_after_order();