-- P14.7 fixture cleanup: remove the stale demo/test Promotion rule that made
-- Basmati Rice cost $8 at every quantity below 10. This is deliberately
-- scoped to the seeded Shifo tenant, named product, named pricelist and exact
-- rule values; it does not alter the pricing algorithm or tenant-created data.
DELETE ppi
FROM pos_pricelist_items ppi
JOIN pos_pricelists pl ON pl.id = ppi.pricelist_id
JOIN products p ON p.id = ppi.product_id AND p.company_id = pl.company_id
JOIN companies c ON c.id = pl.company_id
WHERE c.name = 'Shifo Retail Group'
  AND pl.name = 'Promotion'
  AND p.name = 'Basmati Rice 5kg'
  AND ppi.applies_to = 'product'
  AND ppi.min_quantity = 0
  AND ppi.price_type = 'fixed'
  AND ppi.fixed_price = 8.00;

-- The same temporary fixture also left a blanket 10% General-category rule on the
-- Promotion list. It still changed Basmati qty 9 to $10.80 after the fixed
-- $8 rule was removed, masking the intended isolated qty-10 threshold.
DELETE ppi
FROM pos_pricelist_items ppi
JOIN pos_pricelists pl ON pl.id = ppi.pricelist_id
JOIN companies c ON c.id = pl.company_id
JOIN categories cat ON cat.id = ppi.category_id AND cat.company_id = pl.company_id
WHERE c.name = 'Shifo Retail Group'
  AND pl.name = 'Promotion'
  AND cat.name = 'General'
  AND ppi.applies_to = 'category'
  AND ppi.min_quantity = 0
  AND ppi.price_type = 'discount'
  AND ppi.discount_percent = 10.00;
