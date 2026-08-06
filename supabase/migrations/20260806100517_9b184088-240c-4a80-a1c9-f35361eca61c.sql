UPDATE public.whatsapp_bot_settings
SET business_logo_url = 'https://tawtsykkppopmyxhqkbw.supabase.co/storage/v1/object/public/product-images/bot/whatsapp-profile-logo.png',
    business_phones = ARRAY['+91 81497 12801','+91 86000 11641'],
    business_hours = COALESCE(NULLIF(business_hours,''), 'Mon-Sun, 9:00 AM - 8:00 PM IST'),
    support_number = '+91 81497 12801',
    business_description = COALESCE(NULLIF(business_description,''), 'Farm-fresh organic produce delivered to your door.')
WHERE id = 'default';