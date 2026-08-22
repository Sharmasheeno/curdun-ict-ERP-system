# Curdun POS V2

P1-P16 and Session #32 are the immutable Retail POS baseline. V2 changes are additive post-P16 enhancements.

## V2-P1 capability foundation

The financial core remains shared across every store type: employees, sessions, checkout quotation, payments, cash control, refunds, customer account, pricelists, loyalty, inventory accounting, audit, idempotency, and reports.

Canonical `pos_configs.store_type` values are:

- `retail`
- `bakery_food`
- `fashion`
- `furniture_home`
- `restaurant`
- `electronics`

The backend owns default capability matrices. `pos_configs.capability_overrides` stores only explicit, validated overrides; bootstrap returns the fully resolved `pos_config.capabilities` object. Frontend code asks `posHasStoreCapability(name)` and must not infer functionality from labels or scatter store-type comparisons through financial code.

Changing a store type is rejected while that POS configuration has an opening, open, or closing-control session. Unknown store types and capability keys are rejected with HTTP 422.

V2-P1 does not implement variants, serials, batches, deliveries, tables, or kitchen workflows. It only provides their authoritative configuration foundation for later V2 phases.
