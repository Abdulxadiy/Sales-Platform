import warnings
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

from apps.support.models import Conversation, Message


class StartSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    subject = serializers.CharField(max_length=160)
    language = serializers.ChoiceField(choices=["uz", "ru", "en"])
    text = serializers.CharField(max_length=4000)
    client_id = serializers.UUIDField()
    consent = serializers.BooleanField()

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("Please accept the support privacy notice.")
        return value


class SendSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=4000, required=False, allow_blank=True, default="")
    client_id = serializers.UUIDField()
    image = serializers.FileField(required=False)

    def validate_image(self, upload):
        if upload.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image limit: 2 MB.")
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(upload) as source:
                    if source.format not in ("PNG", "JPEG", "WEBP") or source.width * source.height > 16_000_000:
                        raise ValueError
                    source.load()
                    image = ImageOps.exif_transpose(source).convert("RGB")
                    image.thumbnail((1920, 1920))
                    output = BytesIO()
                    image.save(output, format="JPEG", quality=85)
                    return output.getvalue()
        except (
            OSError,
            ValueError,
            UnidentifiedImageError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ) as exc:
            raise serializers.ValidationError("Use a valid PNG, JPEG or WebP image (up to 16 MP).") from exc

    def validate(self, data):
        if not data.get("text") and not data.get("image"):
            raise serializers.ValidationError("A message or image is required.")
        return data


class ConversationSerializer(serializers.ModelSerializer):
    operator_name = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "name",
            "subject",
            "language",
            "status",
            "operator_id",
            "operator_name",
            "tenant_id",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_operator_name(self, obj):
        return obj.operator.get_full_name() if obj.operator else ""


class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender", "author_name", "client_id", "text", "event", "has_image", "created_at"]

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author and obj.sender == "operator" else ""
