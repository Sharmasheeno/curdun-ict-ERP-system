-- Point 12 — Cash Tender + Change on the CASH payment LINE
-- (so it composes with Point 13 split payments: each cash line carries its
--  own tender/change; non-cash lines leave both NULL.)
ALTER TABLE pos_payments
  ADD COLUMN tendered_amount DECIMAL(15,2) NULL AFTER amount,
  ADD COLUMN change_amount   DECIMAL(15,2) NULL AFTER tendered_amount;

-- Constraint: tendered/change only meaningful for cash-type non-change lines.
-- (Enforced in application layer; MySQL 8 CHECK for defense in depth.)
ALTER TABLE pos_payments
  ADD CONSTRAINT chk_pos_payments_cash_tender
  CHECK (
    (method_type = 'cash' AND is_change = 0)
    OR (tendered_amount IS NULL AND change_amount IS NULL)
  );
