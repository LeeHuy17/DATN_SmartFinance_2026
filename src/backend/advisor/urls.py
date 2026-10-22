from django.urls import path

from .views import InsightsView

urlpatterns = [path("advisor/insights/", InsightsView.as_view(), name="advisor_insights")]