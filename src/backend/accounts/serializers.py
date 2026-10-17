from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("id", "email", "password", "full_name")
        read_only_fields = ("id",)
        # Bỏ UniqueValidator mặc định để validate_email trả thông báo riêng
        extra_kwargs = {"email": {"validators": []}}

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email này đã được đăng ký.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone", "birth_date", "gender", "currency", "date_joined",
        )
        read_only_fields = ("id", "email", "date_joined")

    def validate_birth_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Ngày sinh không được ở tương lai.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không đúng.")
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value

    def validate(self, attrs):
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "Mật khẩu mới phải khác mật khẩu hiện tại."}
            )
        return attrs


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Email luôn lưu chữ thường nên chuẩn hoá trước khi xác thực
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        return super().validate(attrs)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetVerifySerializer(PasswordResetRequestSerializer):
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "Mã gồm 6 chữ số."})


class PasswordResetConfirmSerializer(serializers.Serializer):
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})
