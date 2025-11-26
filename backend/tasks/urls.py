from django.urls import path
from . import views

urlpatterns = [
    path('tasks/analyze/', views.AnalyzeTasksView.as_view(), name='analyze_tasks'),
    path('tasks/suggest/', views.SuggestTasksView.as_view(), name='suggest_tasks'),
]
