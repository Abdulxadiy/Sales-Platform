from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.accounts.serializers import (
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)


class UserProfileView(APIView):
    """
    GET /api/v1/auth/profile/  -> Returns current authenticated user's profile details.
    PATCH /api/v1/auth/profile/ -> Updates first_name, last_name, email, date_of_birth.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'date_of_birth' in data:
            user.date_of_birth = data['date_of_birth']
        if 'contact_phone' in data:
            raw_contact = data['contact_phone']
            if raw_contact:
                norm = user.__class__.objects.normalize_phone_number(raw_contact)
                user.contact_phone = norm or None
            else:
                user.contact_phone = None

        user.profile_completed = True
        user.save()

        out = UserProfileSerializer(user, context={'request': request})
        return Response(out.data, status=status.HTTP_200_OK)


class UserAvatarUploadView(APIView):
    """
    POST /api/v1/auth/profile/avatar/   -> Uploads/changes user avatar image (MinIO).
    DELETE /api/v1/auth/profile/avatar/ -> Removes user avatar.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response(
                {'error': 'Avatar fayli topilmadi'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        avatar_file = request.FILES['avatar']
        user = request.user

        # Delete old avatar if present
        if user.avatar:
            try:
                user.avatar.delete(save=False)
            except Exception:
                pass

        user.avatar = avatar_file
        user.save()

        out = UserProfileSerializer(user, context={'request': request})
        return Response(out.data, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user
        if user.avatar:
            try:
                user.avatar.delete(save=False)
            except Exception:
                pass
            user.avatar = None
            user.save()

        out = UserProfileSerializer(user, context={'request': request})
        return Response(out.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Change password for the authenticated user by verifying old_password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'Joriy parol va yangi parol kiritilishi shart.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if not user.check_password(old_password):
            return Response(
                {'error': 'Joriy parol noto‘g‘ri kiritildi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.token_version = getattr(user, 'token_version', 1) + 1
        user.save()

        # Audit log
        try:
            from apps.core.models import AuditAction
            from apps.core.services.audit_service import AuditService
            AuditService.log(
                action=AuditAction.PASSWORD_RESET,
                actor=user,
                tenant=getattr(user, 'tenant', None),
                target_model="User",
                target_id=str(user.id),
                changes={"token_version": user.token_version},
                description=f"User {user.phone_number or user.username} changed password via profile",
            )
        except Exception:
            pass

        return Response(
            {'message': 'Parol muvaffaqiyatli o‘zgartirildi!'},
            status=status.HTTP_200_OK,
        )

