import os
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from oauth2_provider.models import Application, AccessToken, RefreshToken
from oauthlib.common import generate_token
from django.utils import timezone
from datetime import timedelta

from .serializers import LoginSerializer, UserSerializer, RegisterSerializer
from .models import User


class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    """
    Authenticate user and return OAuth2 tokens.
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data['user']

    # Get or create OAuth2 application
    try:
        app = Application.objects.get(
            client_id=os.environ.get('OAUTH2_CLIENT_ID', 'etl-frontend-client')
        )
    except Application.DoesNotExist:
        return Response(
            {'error': 'OAuth2 application not configured. Run setup_oauth2 management command.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Revoke existing tokens for this user/app
    AccessToken.objects.filter(user=user, application=app).delete()
    RefreshToken.objects.filter(user=user, application=app).delete()

    # Generate new tokens
    access_token = AccessToken.objects.create(
        user=user,
        application=app,
        token=generate_token(),
        expires=timezone.now() + timedelta(seconds=3600),
        scope='read write',
    )

    refresh_token = RefreshToken.objects.create(
        user=user,
        application=app,
        token=generate_token(),
        access_token=access_token,
    )

    # Update last login IP
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    user.last_login_ip = ip
    user.last_login = timezone.now()
    user.save(update_fields=['last_login_ip', 'last_login'])

    return Response({
        'access_token': access_token.token,
        'refresh_token': refresh_token.token,
        'token_type': 'Bearer',
        'expires_in': 3600,
        'scope': 'read write',
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """
    Refresh an access token using a refresh token.
    """
    refresh_token_str = request.data.get('refresh_token')
    if not refresh_token_str:
        return Response(
            {'error': 'refresh_token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        old_refresh = RefreshToken.objects.get(token=refresh_token_str)
    except RefreshToken.DoesNotExist:
        return Response(
            {'error': 'Invalid refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if old_refresh.revoked:
        return Response(
            {'error': 'Refresh token has been revoked'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user = old_refresh.user
    app = old_refresh.application

    # Revoke old tokens
    old_refresh.access_token.delete()
    old_refresh.delete()

    # Create new tokens
    new_access_token = AccessToken.objects.create(
        user=user,
        application=app,
        token=generate_token(),
        expires=timezone.now() + timedelta(seconds=3600),
        scope='read write',
    )

    new_refresh_token = RefreshToken.objects.create(
        user=user,
        application=app,
        token=generate_token(),
        access_token=new_access_token,
    )

    return Response({
        'access_token': new_access_token.token,
        'refresh_token': new_refresh_token.token,
        'token_type': 'Bearer',
        'expires_in': 3600,
        'scope': 'read write',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Revoke the user's current access token.
    """
    token = request.auth
    if token:
        # Revoke refresh tokens associated with this access token
        RefreshToken.objects.filter(access_token=token).delete()
        token.delete()

    return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Get the authenticated user's profile.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Update the authenticated user's profile.
    """
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
