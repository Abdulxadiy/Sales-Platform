from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.inventory.models import Stock, StockMovement, StockTransfer, StockTransferItem
from apps.inventory.services.stock_service import StockService, StockServiceError


class StockTransferServiceError(Exception):
    pass


class StockTransferService:
    @staticmethod
    def _generate_transfer_number(tenant) -> str:
        today_str = timezone.now().strftime('%Y%m%d')
        prefix = f"TRF-{today_str}-"
        last = (
            StockTransfer.objects.select_for_update()
            .filter(tenant=tenant, transfer_number__startswith=prefix)
            .order_by('-transfer_number')
            .first()
        )
        if last:
            try:
                last_seq = int(last.transfer_number.split('-')[-1])
                next_seq = last_seq + 1
            except ValueError:
                next_seq = 1
        else:
            next_seq = 1
        return f"{prefix}{next_seq:04d}"

    @classmethod
    @transaction.atomic
    def create_transfer(
        cls,
        *,
        tenant,
        from_branch,
        to_branch,
        items: list[dict],
        created_by,
        note: str = "",
        auto_accept: bool = False,
    ) -> StockTransfer:
        if from_branch.id == to_branch.id:
            raise StockTransferServiceError("Bitta filialning o'ziga transfer qilib bo'lmaydi.")
        if from_branch.tenant_id != tenant.id or to_branch.tenant_id != tenant.id:
            raise StockTransferServiceError("Filiallar ushbu do'konga tegishli bo'lishi shart.")
        if not items:
            raise StockTransferServiceError("Kamida bitta mahsulot kiritilishi shart.")

        transfer_number = cls._generate_transfer_number(tenant)
        status = StockTransfer.STATUS_ACCEPTED if auto_accept else StockTransfer.STATUS_PENDING

        transfer = StockTransfer.objects.create(
            tenant=tenant,
            transfer_number=transfer_number,
            from_branch=from_branch,
            to_branch=to_branch,
            status=status,
            sent_by=created_by,
            resolved_by=created_by if auto_accept else None,
            resolved_at=timezone.now() if auto_accept else None,
            note=note,
        )

        for item_data in items:
            variant = item_data["product_variant"]
            qty = Decimal(str(item_data["quantity"]))
            if qty <= 0:
                raise StockTransferServiceError("Miqdor 0 dan katta bo'lishi kerak.")

            StockTransferItem.objects.create(
                tenant=tenant,
                transfer=transfer,
                product_variant=variant,
                quantity=qty,
            )

            # Deduct from source branch
            StockService._apply_movement(
                tenant=tenant,
                branch=from_branch,
                product_variant=variant,
                type=StockMovement.TYPE_TRANSFER_OUT,
                direction=StockMovement.DIRECTION_OUT,
                quantity=qty,
                created_by=created_by,
                note=f"Transfer #{transfer_number} -> {to_branch.name}",
                transfer=transfer,
            )

            # If auto accepted, directly add to target branch
            if auto_accept:
                StockService._apply_movement(
                    tenant=tenant,
                    branch=to_branch,
                    product_variant=variant,
                    type=StockMovement.TYPE_TRANSFER_IN,
                    direction=StockMovement.DIRECTION_IN,
                    quantity=qty,
                    created_by=created_by,
                    note=f"Transfer #{transfer_number} <- {from_branch.name}",
                    transfer=transfer,
                )

        return transfer

    @classmethod
    @transaction.atomic
    def accept_transfer(cls, *, transfer: StockTransfer, user) -> StockTransfer:
        transfer = StockTransfer.objects.select_for_update().get(pk=transfer.pk)
        if transfer.status != StockTransfer.STATUS_PENDING:
            raise StockTransferServiceError(f"Ushbu transfer allaqachon '{transfer.get_status_display()}' holatida.")

        for item in transfer.items.all():
            StockService._apply_movement(
                tenant=transfer.tenant,
                branch=transfer.to_branch,
                product_variant=item.product_variant,
                type=StockMovement.TYPE_TRANSFER_IN,
                direction=StockMovement.DIRECTION_IN,
                quantity=item.quantity,
                created_by=user,
                note=f"Transfer #{transfer.transfer_number} qabul qilindi ({transfer.from_branch.name} dan)",
                transfer=transfer,
            )

        transfer.status = StockTransfer.STATUS_ACCEPTED
        transfer.resolved_by = user
        transfer.resolved_at = timezone.now()
        transfer.save(update_fields=["status", "resolved_by", "resolved_at", "updated_at"])
        return transfer

    @classmethod
    @transaction.atomic
    def reject_transfer(cls, *, transfer: StockTransfer, user, reason: str = "") -> StockTransfer:
        transfer = StockTransfer.objects.select_for_update().get(pk=transfer.pk)
        if transfer.status != StockTransfer.STATUS_PENDING:
            raise StockTransferServiceError(f"Ushbu transfer allaqachon '{transfer.get_status_display()}' holatida.")

        # Return stock to source branch
        for item in transfer.items.all():
            StockService._apply_movement(
                tenant=transfer.tenant,
                branch=transfer.from_branch,
                product_variant=item.product_variant,
                type=StockMovement.TYPE_TRANSFER_IN,
                direction=StockMovement.DIRECTION_IN,
                quantity=item.quantity,
                created_by=user,
                note=f"Transfer #{transfer.transfer_number} rad etildi, qaytarildi. Sabab: {reason}",
                transfer=transfer,
            )

        transfer.status = StockTransfer.STATUS_REJECTED
        transfer.reject_reason = reason
        transfer.resolved_by = user
        transfer.resolved_at = timezone.now()
        transfer.save(update_fields=["status", "reject_reason", "resolved_by", "resolved_at", "updated_at"])
        return transfer
