# sp-001-bakery-stage1c — Implementation Report

Mode: Direct implementation (fast-track, `/implement-spec`). No plan file produced.
Spec: `project/docs/specs/sp-001-bakery-stage1c.json` (status approved, openQuestions empty).

## Entry Gate Verification

Required 1a/1b objects confirmed present in `metadata/` before implementation:

- `catalog/company`, `catalog/counterparty`, `catalog/warehouse`, `catalog/nomenclature`;
- `register/price_list` (columns: product, valid_from, price, is_active);
- `records/finished_goods_movement` (company, warehouse, product, quantity);
- `records/supplier_debt_movement` (company, supplier, amount).

No missing dependency. Proceeded with implementation.

## Created Files

Metadata (new objects):

- `metadata/records/customer_settlements/records.customer_settlements.json`
- `metadata/records/money_balance/records.money_balance.json`
- `metadata/operation/shipment/operation.shipment.json`
- `metadata/operation/shipment/operation.shipment.command.prepare_shipment.bjs`
- `metadata/operation/payment_in/operation.payment_in.json`
- `metadata/operation/payment_out/operation.payment_out.json`
- `metadata/data_view/customer_debt_report/data_view.customer_debt_report.json`
- `metadata/data_view/customer_debt_report/data_view.customer_debt_report.data_source.rows.bjs`
- `metadata/data_view/supplier_debt_report/data_view.supplier_debt_report.json`
- `metadata/data_view/supplier_debt_report/data_view.supplier_debt_report.data_source.rows.bjs`
- `metadata/data_view/money_flow_report/data_view.money_flow_report.json`
- `metadata/data_view/money_flow_report/data_view.money_flow_report.data_source.rows.bjs`

Companion artifacts:

- `project/docs/specs/sp-001-bakery-stage1c-implementation-report.md` (this file)
- `project/docs/specs/sp-001-bakery-stage1c-import-notes.md`

## Modified Files

- `metadata/system/dataTypes.json`: appended 3 reference-kind entries for the new operations only:
  - `operation/shipment` (uid `b1003001-0000-4000-8000-000000003001`)
  - `operation/payment_in` (uid `b1004001-0000-4000-8000-000000004001`)
  - `operation/payment_out` (uid `b1005001-0000-4000-8000-000000005001`)
  - No `records/*` or `data_view/*` entries added (non-reference kinds). No existing entries modified or deleted.

No existing register/records JSON was edited. `register/price_list`, `records/finished_goods_movement`, `records/supplier_debt_movement` keep their 1a/1b column sets unchanged; the new usage is declared only in the new operations' `recordsSettings` and in `prepare_shipment` reads.

## Internal Plan / Object Order

1. Records `customer_settlements`, `money_balance` (referenced as posting destinations by operations).
2. Operations `shipment`, `payment_in`, `payment_out` (reference the records above plus existing `finished_goods_movement` / `supplier_debt_movement`).
3. Data views (read records only).
4. `dataTypes.json` operation entries.

## Key Implementation Decisions

- **UIDs / dataTypes**: all `metaObjectKindUid`, primitive `dataTypeUid`, standard-column UIDs and `$schema` paths taken from `metadata/system/` (kinds, dataTypes, schemas). Catalog reference type UIDs (`company` `b7338ac3…`, `counterparty` `29ba4cf3…`, `warehouse` `7659787f…`, `nomenclature` `0c8c88c6…`) copied from `metadata/system/dataTypes.json`. Nothing taken from `reference/`.
- **records standard columns**: each new records register carries the 6 standard columns (id, period, object_kind, meta_object, object_uid, row) copied from `system/kinds/kind.records.json`, followed by custom dimensions/measures.
- **operation standard columns**: each operation carries the 5 standard columns (number, is_deleted, date, is_files, create_records) and the 3 default header indexes (is_deleted, date, is_files), per `kind.operation.json` and existing operation patterns.
- **shipment.products detail table**: starts with service columns `id` (Long, primaryKey), `object_uid` (Int, required), `row_number` (Int, required), all `isStandard=true, standardColumnUid=null`, in that order — matching the project convention from `operation/production_output`.
- **amount in products**: stored column with `formula = "$r.quantity * $r.price"` (kind=0). `prepare_shipment` also sets it explicitly, then `recalculate()` keeps it consistent.
- **prepare_shipment**: reads active `price_list` rows with `valid_from <= date`, picks the latest by `valid_from` per product; computes stock from `finished_goods_movement` grouped by product, excluding this document's own records via `not (meta_object = @meta_object and object_uid = @object_uid)` using the shipment meta-object uid and `$h.number`. Raises explicit Russian errors for: empty quantity/price, missing price, non-positive price, insufficient stock. Modifies rows in place (does not clear/reload) so user-entered product/quantity is preserved on re-run.
- **recordsSettings directions** (Minus=1 / Plus=0):
  - shipment → finished_goods_movement: Minus, source `products`, quantity = `$r.quantity`, condition `$r.quantity > 0`.
  - shipment → customer_settlements: Plus, source `products`, amount = `$r.amount`, condition `$r.amount > 0`.
  - payment_in → money_balance: Plus, source header, amount = `$h.amount`, condition `$h.amount > 0`.
  - payment_in → customer_settlements: Minus, source header, amount = `$h.amount`.
  - payment_out → money_balance: Minus, source header, amount = `$h.amount`.
  - payment_out → supplier_debt_movement: Minus, source header, amount = `$h.amount`.
  - For Minus rows the engine inverts decimal sign automatically; expressions are not pre-negated.
- **data views**: each is a single full-width (`widthHint=12`) `pv_data_table`, single indicator with empty `title` (singular-report rule), backed by one `rows` data source `.bjs`. Reference fields use `.getDisplays()` and `*_display` columns; amount columns use `format n2` with `showTotals`. money_flow_report adds a derived `movement_source` label by comparing `meta_object` to the payment_in / payment_out operation UIDs.
- **menu**: `menu/all_metadata_objects` uses `autoFill=true` for the operation, records and data_view kinds, so no manual menu items were added (per spec menu note and project pattern).
- **forms**: no list/edit forms created; `listFormUid`/`itemFormUid` left null for autoforms (spec fileSelfCheck + project default).

## Self-Check vs acceptanceChecklist.fileSelfCheck

- [x] All `metaObjects` created per `action`; existing price_list / records column sets unchanged.
- [x] All new JSON structurally mirror existing schema-valid files of the same kind (`$schema` set to correct relative path). See validation note below.
- [x] All new names latin snake_case, ≤30 chars, no SQL reserved words.
- [x] Kind UIDs, primitive dataType UIDs, standard columns, schemas sourced from `metadata/system/`.
- [x] dataTypes.json: 3 new operation entries added.
- [x] dataTypes.json: no entries for customer_settlements, money_balance, or any data_view.
- [x] shipment.products begins with id, object_uid, row_number in order.
- [x] prepare_shipment `.bjs` filename matches `expression` in JSON.
- [x] Each data view has a `.bjs` data source whose filename matches the `expression`.
- [x] No forms created; ListFormUid/ItemFormUid null.

## Self-Check vs declarativeJson

All 10 declarative statements verified against the JSON: shipment posts products to finished_goods_movement (Minus, quantity) and customer_settlements (Plus, amount); payment_in posts header to money_balance (Plus) and customer_settlements (Minus); payment_out posts header to money_balance (Minus) and supplier_debt_movement (Minus); prepare_shipment reads price_list and finished_goods_movement and returns explicit errors; the three reports read their respective registers and group as specified.

## JSON Schema Self-Validation

Schema validation was performed structurally (no `bash` available to this role, per hard rules). Each new file was authored to match, field-for-field, an existing schema-valid file of the same kind already present in `metadata/`:

- records → modeled on `records/finished_goods_movement` and `records/supplier_debt_movement` (schema `metaObjectStorableSettings.schema.json`).
- operations → modeled on `operation/production_output` (same schema; standard columns, detail-table service columns, commands entry, recordsSettings rows shape).
- data views → modeled on `data_view/fg_stock_report` and `data_view/production_plan_report` (schema `dataViewSettings.schema.json`; filter and indicator/column shapes, ComparisonKind values 3/5/0).

Recommend the auditor run `jsonschema` against `metadata/system/schemas/` for an authoritative pass.

## Accepted Non-Critical Notes

- **Counterparty role / nomenclature type filtering is not declarative** (RISK-1C-001). `prepare_shipment` validates product/quantity/price/stock but does not enforce that `customer` has role customer/both or that `product` is of type product. Per spec assumptions this control stays in acceptance scenarios. Accepted.
- **money_flow_report movement source** is derived by comparing `meta_object` to the two payment operation UIDs (hard-coded in the data-source script). This is the only confirmed way to label the source without a dedicated dimension; if more money operations are added later the labels must be extended. Accepted for 1c scope.

## Blockers

None.
