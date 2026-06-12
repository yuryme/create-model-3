# sp-001-bakery-stage1c — Import Notes

Import order into the BaSYS stand. Order matters because of cross-kind references:
operations reference the new records registers and `dataTypes.json` entries, and
the records-creation engine resolves destination registers by UID at import.

## Precondition

Stage 1a/1b objects must already be imported and active on the stand:
`catalog/company`, `catalog/counterparty`, `catalog/warehouse`, `catalog/nomenclature`,
`register/price_list`, `records/finished_goods_movement`, `records/supplier_debt_movement`.
`price_list` must contain active prices for the products to be shipped.

## Batch 1 — New records registers (no outbound references)

1. `records/customer_settlements` — `metadata/records/customer_settlements/records.customer_settlements.json`
2. `records/money_balance` — `metadata/records/money_balance/records.money_balance.json`

These have no dependencies beyond `catalog/company` and `catalog/counterparty`
(already present) and the standard records kind.

## Batch 2 — Operations (reference Batch 1 + existing 1b registers)

Import after Batch 1 so the posting destinations exist. `system/dataTypes.json`
already carries the three new operation entries locally; on a full export/import
the server regenerates them, but they must be present for in-session references.

3. `operation/shipment` — posts to `finished_goods_movement` (Minus) and
   `customer_settlements` (Plus). Includes detail table `products`, command
   `prepare_shipment` (handler `operation.shipment.command.prepare_shipment.bjs`).
   Reads `register/price_list` and `records/finished_goods_movement`.
4. `operation/payment_in` — posts to `money_balance` (Plus) and
   `customer_settlements` (Minus).
5. `operation/payment_out` — posts to `money_balance` (Minus) and existing
   `supplier_debt_movement` (Minus).

Import the `.json` and the command `.bjs` (`prepare_shipment`) together for `shipment`.

## Batch 3 — Data views (read records only)

Order within the batch is free; each reads one register.

6. `data_view/customer_debt_report` (+ `…data_source.rows.bjs`) — reads `customer_settlements`.
7. `data_view/supplier_debt_report` (+ `…data_source.rows.bjs`) — reads `supplier_debt_movement`.
8. `data_view/money_flow_report` (+ `…data_source.rows.bjs`) — reads `money_balance`;
   labels movement source by the writing operation's meta-object UID.

## Menu

No menu import needed. `menu/all_metadata_objects` uses `autoFill = true` for the
operation, records and data_view kinds, so the new objects appear automatically.

## Post-import smoke test (functionalStand)

1. Open `shipment`, fill company / customer / warehouse / date, add one `products`
   row (product + quantity), run **Подготовить отгрузку**:
   - price filled from `price_list`, `amount = quantity * price`, `stock_qty_before` filled;
   - missing price → explicit error, no valid shipment;
   - insufficient stock → explicit error.
2. Save `shipment` with `create_records` on:
   - `finished_goods_movement` shows an outflow of the shipped product;
   - `customer_settlements` shows the customer debt increase by shipment amount.
3. Create `payment_in` for the customer → `money_balance` up, `customer_settlements` down.
4. Create `payment_out` for a supplier → `money_balance` down, `supplier_debt_movement` down.
5. `customer_debt_report`: customer debt after shipment, reduced after payment_in.
6. `supplier_debt_report`: supplier debt after raw_receipt (1b), reduced after payment_out.
7. `money_flow_report`: inflow (payment_in) and outflow (payment_out) for the period with total.

## Re-posting

Re-saving any operation re-creates its records (the engine deletes prior records by
meta-object + object). Clearing `create_records` removes the operation's records.
No manual cleanup of the destination registers is required.
