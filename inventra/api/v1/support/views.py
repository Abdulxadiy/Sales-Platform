import hashlib
import logging
import re
from ipaddress import ip_address

from django.conf import settings
from django.core.cache import caches
from django.db import ProgrammingError, transaction
from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from api.pagination import StandardResultsSetPagination
from api.permissions import IsPlatformAdmin
from apps.accounts.services.tenant_context_service import resolve_active_context
from apps.support.models import Conversation, Message
from apps.support.tasks import enqueue_notification

from .serializers import ConversationSerializer, MessageSerializer, SendSerializer, StartSerializer

logger = logging.getLogger(__name__)


class SupportThrottle(SimpleRateThrottle):
    scope = "support"

    @property
    def cache(self):
        return caches["support"]

    def get_rate(self):
        return "120/min"

    def get_ident(self, request):
        # Both project Nginx configs append the actual client address. Do not
        # include a client-supplied XFF prefix in the rate-limit identity.
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        candidate = forwarded.split(",")[-1].strip() if forwarded else request.META.get("REMOTE_ADDR", "")
        try:
            return str(ip_address(candidate))
        except ValueError:
            return request.META.get("REMOTE_ADDR", "unknown")

    def get_cache_key(self, request, view):
        ident = f"user:{request.user.pk}" if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class SupportWriteThrottle(SupportThrottle):
    scope = "support_write"

    def get_rate(self):
        return "20/min"

    def allow_request(self, request, view):
        return True if request.method in ("GET", "HEAD", "OPTIONS") else super().allow_request(request, view)


def is_operator(request):
    return request.user.is_authenticated and request.user.role == "platform_admin"


def guest_hash(request):
    token = request.headers.get("X-Support-Token", "")
    if not re.fullmatch(r"[a-f0-9]{64}", token):
        raise PermissionDenied("A private support browser key is required.")
    return hashlib.sha256(token.encode()).hexdigest()


def accessible(request, *, inbox=False):
    queryset = Conversation.objects.select_related("operator")
    if inbox:
        if not is_operator(request):
            raise PermissionDenied()
        return queryset
    if request.user.is_authenticated:
        return queryset.filter(user=request.user)
    return queryset.filter(user__isnull=True, guest_hash=guest_hash(request))


def with_unread(queryset, operator):
    return queryset.annotate(
        unread_count=Count(
            "messages",
            filter=Q(
                messages__sender="visitor" if operator else "operator",
                messages__id__gt=F("operator_read_id" if operator else "visitor_read_id"),
            ),
        )
    ).order_by("-updated_at", "id")


class SupportView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SupportThrottle, SupportWriteThrottle]

    def handle_exception(self, exc):
        # A development code reload does not apply new migrations. Keep this
        # failure recoverable without hiding unrelated SQL/programming errors.
        driver_error = getattr(exc, "__cause__", None)
        missing_table = getattr(driver_error, "pgcode", None) == "42P01"
        support_table = any(f'"{table}"' in str(exc) for table in ("support_conversation", "support_message"))
        if isinstance(exc, ProgrammingError) and missing_table and support_table:
            logger.error("Support tables are missing; apply the support migrations before serving chat requests.")
            return Response(
                {
                    "error": {
                        "code": "support_not_ready",
                        "message": "Support is temporarily unavailable. Try again shortly.",
                    }
                },
                status=503,
                headers={"Retry-After": "30"},
            )
        return super().handle_exception(exc)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        response["Vary"] = "Authorization, X-Support-Token"
        return response


class MetadataView(SupportView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "phone": settings.SUPPORT_PHONE,
                "telegram_username": settings.SUPPORT_TELEGRAM_USERNAME,
                "languages": ["uz", "ru", "en"],
                "ai_enabled": False,
                "max_image_bytes": 2 * 1024 * 1024,
            }
        )


class ConversationsView(SupportView):
    def get(self, request):
        queryset = with_unread(accessible(request), False)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(ConversationSerializer(page, many=True).data)
        response.data["unread_total"] = queryset.aggregate(total=Sum("unread_count"))["total"] or 0
        return response

    @transaction.atomic
    def post(self, request):
        data = StartSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        existing = accessible(request).filter(messages__client_id=values["client_id"]).first()
        if existing:
            return Response(ConversationSerializer(existing).data)
        if accessible(request).exclude(status="closed").count() >= 5:
            raise ValidationError("Please use one of your existing open conversations (limit: 5).")
        tenant = None
        if request.user.is_authenticated and request.headers.get("X-Tenant-ID"):
            tenant = resolve_active_context(request.user, request.headers.get("X-Tenant-ID")).tenant
        conversation = Conversation.objects.create(
            user=request.user if request.user.is_authenticated else None,
            guest_hash="" if request.user.is_authenticated else guest_hash(request),
            tenant=tenant,
            name=values["name"],
            subject=values["subject"],
            language=values["language"],
        )
        Message.objects.create(
            conversation=conversation,
            sender="visitor",
            author=request.user if request.user.is_authenticated else None,
            client_id=values["client_id"],
            text=values["text"],
        )
        transaction.on_commit(lambda: enqueue_notification(conversation.pk))
        return Response(ConversationSerializer(conversation).data, status=201)


class GuestConversationsView(ConversationsView):
    authentication_classes = []
    permission_classes = [AllowAny]


class InboxView(SupportView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        queryset = with_unread(accessible(request, inbox=True), True)
        status = request.query_params.get("status")
        if status:
            if status not in Conversation.Status.values:
                raise ValidationError("Unknown status.")
            queryset = queryset.filter(status=status)
        if request.query_params.get("mine") == "true":
            queryset = queryset.filter(operator=request.user)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        response = paginator.get_paginated_response(ConversationSerializer(page, many=True).data)
        response.data["unread_total"] = queryset.aggregate(total=Sum("unread_count"))["total"] or 0
        return response


class ConversationView(SupportView):
    inbox = False

    def get_conversation(self, request, pk, lock=False):
        queryset = accessible(request, inbox=self.inbox)
        if lock:
            queryset = queryset.select_for_update(of=("self",))
        return get_object_or_404(queryset, pk=pk)

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)
        return Response(
            ConversationSerializer(
                with_unread(
                    Conversation.objects.select_related("operator").filter(pk=conversation.pk),
                    self.inbox,
                ).get()
            ).data
        )

    @transaction.atomic
    def post(self, request, pk):
        conversation = self.get_conversation(request, pk, lock=True)
        action = request.data.get("action")
        if action == "read":
            field = serializers.IntegerField(min_value=0)
            through = field.run_validation(request.data.get("through_id"))
            latest = conversation.messages.order_by("-id").values_list("id", flat=True).first() or 0
            key = "operator_read_id" if self.inbox else "visitor_read_id"
            setattr(conversation, key, max(getattr(conversation, key), min(through, latest)))
            conversation.save(update_fields=[key])
            return Response({"ok": True})
        if action == "claim" and self.inbox:
            if conversation.status == "closed":
                raise ValidationError("Reopen the conversation first.")
            if conversation.operator_id not in (None, request.user.pk):
                return Response({"detail": "Another operator has accepted this conversation."}, status=409)
            if conversation.status == "active" and conversation.operator_id == request.user.pk:
                return Response(ConversationSerializer(conversation).data)
            conversation.operator = request.user
            conversation.status = "active"
        elif action == "close":
            if self.inbox and conversation.operator_id not in (None, request.user.pk):
                return Response({"detail": "This conversation belongs to another operator."}, status=409)
            if conversation.status == "closed":
                return Response(ConversationSerializer(conversation).data)
            conversation.status = "closed"
        elif action == "reopen" and conversation.status == "closed":
            conversation.status = "waiting"
            conversation.operator = None
            transaction.on_commit(lambda: enqueue_notification(conversation.pk))
        else:
            raise ValidationError("Unknown action or invalid conversation state.")
        conversation.save(update_fields=["operator", "status", "updated_at"])
        Message.objects.create(
            conversation=conversation,
            sender="system",
            event=action,
            author=request.user if request.user.is_authenticated else None,
        )
        return Response(ConversationSerializer(conversation).data)


class GuestConversationView(ConversationView):
    authentication_classes = []
    permission_classes = [AllowAny]


class OperatorConversationView(ConversationView):
    permission_classes = [IsPlatformAdmin]
    inbox = True


class MessagesView(ConversationView):
    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)
        queryset = conversation.messages.defer("image_data").select_related("author")
        after = request.query_params.get("after_id")
        before = request.query_params.get("before_id")
        if after and before:
            raise ValidationError("Use either after_id or before_id.")
        if after or before:
            cursor = serializers.IntegerField(min_value=0).run_validation(after or before)
            queryset = queryset.filter(id__gt=cursor) if after else queryset.filter(id__lt=cursor)
        rows = list(queryset.order_by("id" if after else "-id")[:51])
        more = len(rows) > 50
        rows = rows[:50]
        if not after:
            rows.reverse()
        return Response({"results": MessageSerializer(rows, many=True).data, "has_more": more})

    @transaction.atomic
    def post(self, request, pk):
        conversation = self.get_conversation(request, pk, lock=True)
        serializer = SendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        sender = "operator" if self.inbox else "visitor"
        existing = conversation.messages.filter(client_id=data["client_id"]).defer("image_data").first()
        if existing:
            author_id = request.user.pk if request.user.is_authenticated else None
            if existing.sender != sender or existing.author_id != author_id:
                raise ValidationError("Message identifier is already in use.")
            return Response(MessageSerializer(existing).data)
        if conversation.status == "closed":
            raise ValidationError("Reopen the conversation before sending a message.")
        if self.inbox and (conversation.operator_id != request.user.pk or conversation.status != "active"):
            return Response({"detail": "Accept the conversation before replying."}, status=409)
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            author=request.user if request.user.is_authenticated else None,
            client_id=data["client_id"],
            text=data["text"],
            image_data=data.get("image"),
            has_image=bool(data.get("image")),
        )
        previous_update = conversation.updated_at
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])
        if not self.inbox and (
            conversation.status == "waiting" or (conversation.updated_at - previous_update).total_seconds() > 60
        ):
            transaction.on_commit(lambda: enqueue_notification(conversation.pk))
        return Response(MessageSerializer(message).data, status=201)


class GuestMessagesView(MessagesView):
    authentication_classes = []
    permission_classes = [AllowAny]


class OperatorMessagesView(MessagesView):
    permission_classes = [IsPlatformAdmin]
    inbox = True


class ImageView(ConversationView):
    def get(self, request, pk, message_id):
        conversation = self.get_conversation(request, pk)
        message = get_object_or_404(conversation.messages, pk=message_id, has_image=True)
        response = HttpResponse(bytes(message.image_data), content_type="image/jpeg")
        response["Content-Disposition"] = 'inline; filename="support-image.jpg"'
        response["X-Content-Type-Options"] = "nosniff"
        return response


class GuestImageView(ImageView):
    authentication_classes = []
    permission_classes = [AllowAny]


class OperatorImageView(ImageView):
    permission_classes = [IsPlatformAdmin]
    inbox = True
