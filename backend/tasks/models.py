from django.db import models
import json


class Task(models.Model):
    task_id = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.FloatField(null=True, blank=True)
    importance = models.IntegerField(null=True, blank=True)
    dependencies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.task_id}: {self.title}"

    class Meta:
        ordering = ['created_at']


class TaskAnalysis(models.Model):
    strategy = models.CharField(max_length=50, default="Smart Balance")
    analyzed_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Analysis {self.id} - {self.strategy}"
