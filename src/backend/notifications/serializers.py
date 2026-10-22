from rest_framework import serializers

from .models import Notification, NotificationSetting


class NotificationSerializer(serializers.ModelSerializer):
    read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ("id", "type", "title", "body", "link", "tone", "read", "created_at")
        read_only_fields = fields

    def get_read(self, obj):
        return obj.read_at is not None


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSetting
        fields = ("budget", "ocr", "reminder", "advice", "banner", "push", "email")
