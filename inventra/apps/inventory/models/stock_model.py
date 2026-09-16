"""Stock -- the materialized "how much is there right now" balance for
a ProductVariant. Never written to directly: StockService is the only
code allowed to change `quantity`, always in the same transaction as
the StockMovement row that explains why (see stock_movement_model.py).
See Architectures/inventra-yol-xaritasi.md, 9-bosqich (inventory),
for the full design rationale."""

