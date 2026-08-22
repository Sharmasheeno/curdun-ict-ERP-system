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

## V2-P2 navigation and configuration

Navigation reads the resolved bootstrap capability matrix through `posHasStoreCapability()`. Store-specific modules that do not yet exist are deliberately absent from production navigation; Settings lists them with their planned V2 phase instead of presenting fake pages.

Settings → Store Features shows the canonical store type, resolved state, store-type default, and any explicit override. Shared financial-core capabilities are visible but cannot be overridden. Only optional store-specific capabilities accept explicit On/Off overrides.

Future specialized service operations must call the backend store-capability guard before reading or changing their domain data. Until those modules exist, their API routes remain unregistered, so hidden navigation cannot be bypassed with a direct request.
