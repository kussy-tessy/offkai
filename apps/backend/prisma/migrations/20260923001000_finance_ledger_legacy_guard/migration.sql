-- Serialize legacy mutations with cutover, and prevent a stale request from
-- writing the old tables after its event has switched to the ledger.
CREATE FUNCTION "guardLegacyFinanceWrite"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_data jsonb;
  event_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := to_jsonb(OLD); ELSE row_data := to_jsonb(NEW); END IF;
  -- Cascades caused by answer deletion are safe: the ledger retains identities.
  IF row_data ? 'answerId' AND NOT EXISTS (SELECT 1 FROM "OffkaiAnswer" WHERE id = row_data->>'answerId') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME IN ('EventFinance', 'SettlementCategory') THEN
    event_id := row_data->>'eventId';
  ELSIF TG_TABLE_NAME IN ('SettlementCategoryMember', 'SettlementExpense', 'SettlementIncome') THEN
    SELECT "eventId" INTO event_id FROM "SettlementCategory" WHERE id = row_data->>'categoryId';
  ELSIF TG_TABLE_NAME = 'SettlementExpenseRecipient' THEN
    SELECT c."eventId" INTO event_id FROM "SettlementExpense" e JOIN "SettlementCategory" c ON c.id = e."categoryId" WHERE e.id = row_data->>'expenseId';
  ELSE
    SELECT "eventId" INTO event_id FROM "OffkaiAnswer" WHERE id = row_data->>'answerId';
  END IF;
  -- Event deletion must still cascade normally.
  IF event_id IS NOT NULL AND EXISTS (SELECT 1 FROM "OffkaiEvent" WHERE id = event_id) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('finance-ledger:' || event_id, 0));
    IF EXISTS (SELECT 1 FROM "FinanceLedger" WHERE "eventId" = event_id) THEN
      RAISE EXCEPTION 'This event uses the finance ledger; legacy finance is read-only';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['EventFinance','SettlementCategory','SettlementCategoryMember','SettlementExpense','SettlementExpenseRecipient','SettlementIncome','ParticipantFinance','ParticipantExtraCharge','ParticipantPayment'] LOOP
   EXECUTE format('CREATE TRIGGER "guard_legacy_finance_write" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "guardLegacyFinanceWrite"()', table_name);
 END LOOP;
END;
$$;
