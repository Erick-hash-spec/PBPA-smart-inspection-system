"""JWT login serializer that performs a TOTP challenge when MFA is enabled."""
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .mfa import verify_code
from .models import ActivityLog, UserProfile


class MFAAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        required = settings.MFA_ENABLED and (
            profile.mfa_enabled or profile.role in settings.MFA_REQUIRED_ROLES
        )
        if required and not verify_code(profile.mfa_secret, str(self.initial_data.get('otp', ''))):
            ActivityLog.log(self.user, 'login_failed', detail='MFA challenge failed.', request=self.context.get('request'))
            raise AuthenticationFailed('A valid authenticator code is required.', code='mfa_required')
        ActivityLog.log(self.user, 'login', detail='JWT login completed.', request=self.context.get('request'))
        return data
