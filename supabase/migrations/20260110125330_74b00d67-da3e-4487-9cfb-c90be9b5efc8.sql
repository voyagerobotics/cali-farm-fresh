-- Add seasonal box customization columns to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN seasonal_box_title TEXT NOT NULL DEFAULT 'Seasonal Vegetable Box',
ADD COLUMN seasonal_box_description TEXT NOT NULL DEFAULT 'A curated mix of 5-6 seasonal vegetables, perfect for a week''s healthy cooking',
ADD COLUMN seasonal_box_price NUMERIC NOT NULL DEFAULT 299,
ADD COLUMN seasonal_box_badge TEXT NOT NULL DEFAULT 'Best Value',
ADD COLUMN seasonal_box_button_text TEXT NOT NULL DEFAULT 'Order Now',
ADD COLUMN seasonal_box_button_link TEXT DEFAULT NULL,
ADD COLUMN order_days TEXT[] NOT NULL DEFAULT ARRAY['tuesday', 'friday']::TEXT[],
ADD COLUMN delivery_time_slot TEXT NOT NULL DEFAULT '12:00 PM - 3:00 PM';