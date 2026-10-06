from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from api.v1.accounts.serializers import CompleteProfileSerializer


class CompleteProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CompleteProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        user.first_name = data.get('first_name', '')
        user.last_name = data.get('last_name', '')
        user.email = data.get('email', '')
        if data.get('date_of_birth'):                   # date_of_birth is optional; only update it if the client actually sent a value,
            user.date_of_birth = data['date_of_birth']  # since data.get() returns None when the key is missing.

        if 'contact_phone' in data:
            raw_contact = data.get('contact_phone')
            if raw_contact:
                norm = user.__class__.objects.normalize_phone_number(raw_contact)
                user.contact_phone = norm or None
            else:
                user.contact_phone = None

        user.profile_completed = True
        user.save()
        return Response(status=status.HTTP_200_OK)
