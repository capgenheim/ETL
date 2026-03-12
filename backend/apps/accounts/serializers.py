from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data."""

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'is_active', 'last_login', 'created_at',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_active', 'last_login', 'created_at']


class LoginSerializer(serializers.Serializer):
    """Serializer for login credentials."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        # Check if user exists and is locked
        try:
            user = User.objects.get(email=email)
            if user.is_locked:
                raise serializers.ValidationError(
                    'Account is temporarily locked due to too many failed attempts. '
                    'Please try again later.'
                )
        except User.DoesNotExist:
            pass

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password,
        )

        if not user:
            # Increment failed attempts if user exists
            try:
                existing_user = User.objects.get(email=email)
                existing_user.increment_failed_attempts()
            except User.DoesNotExist:
                pass
            raise serializers.ValidationError('Invalid email or password.')

        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')

        # Reset failed attempts on success
        user.reset_failed_attempts()

        attrs['user'] = user
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=10)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password'],
        )
        return user
