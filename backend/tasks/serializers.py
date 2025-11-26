from rest_framework import serializers


class TaskSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    due_date = serializers.DateField(required=False, allow_null=True)
    estimated_hours = serializers.FloatField(required=False, allow_null=True)
    importance = serializers.IntegerField(required=False, allow_null=True)
    dependencies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class AnalyzeRequestSerializer(serializers.Serializer):
    strategy = serializers.CharField(required=False, default="Smart Balance")
    tasks = TaskSerializer(many=True)


class TaskResultSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    due_date = serializers.DateField(allow_null=True)
    estimated_hours = serializers.FloatField()
    importance = serializers.IntegerField()
    dependencies = serializers.ListField(child=serializers.CharField())
    score = serializers.FloatField()
    priority = serializers.CharField()
    explanation = serializers.CharField()


class AnalyzeResponseSerializer(serializers.Serializer):
    analyzed_at = serializers.DateTimeField()
    strategy = serializers.CharField()
    tasks = TaskResultSerializer(many=True)


class SuggestTaskSerializer(serializers.Serializer):
    id = serializers.CharField()
    score = serializers.FloatField()
    priority = serializers.CharField()
    why = serializers.CharField()


class SuggestResponseSerializer(serializers.Serializer):
    suggested_at = serializers.DateTimeField()
    top = SuggestTaskSerializer(many=True)
