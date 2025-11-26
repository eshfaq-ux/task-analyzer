from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .serializers import AnalyzeRequestSerializer, AnalyzeResponseSerializer, SuggestResponseSerializer
from .scoring import compute_scores

# In-memory storage for last analyzed tasks
last_analyzed_tasks = None


class AnalyzeTasksView(APIView):
    def post(self, request):
        global last_analyzed_tasks
        
        serializer = AnalyzeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        strategy = serializer.validated_data['strategy']
        tasks = serializer.validated_data['tasks']
        
        # Convert serialized data to dict format for scoring
        task_dicts = []
        for task_data in tasks:
            task_dict = {
                'id': task_data['id'],
                'title': task_data['title'],
                'due_date': task_data.get('due_date'),
                'estimated_hours': task_data.get('estimated_hours'),
                'importance': task_data.get('importance'),
                'dependencies': task_data.get('dependencies', [])
            }
            task_dicts.append(task_dict)
        
        # Compute scores
        scored_tasks = compute_scores(task_dicts, strategy)
        
        # Store for suggestions endpoint
        last_analyzed_tasks = scored_tasks
        
        response_data = {
            'analyzed_at': timezone.now(),
            'strategy': strategy,
            'tasks': scored_tasks
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class SuggestTasksView(APIView):
    def get(self, request):
        global last_analyzed_tasks
        
        if not last_analyzed_tasks:
            return Response(
                {'error': 'No tasks analyzed yet. Please analyze tasks first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get top 3 tasks with suggestions
        top_tasks = []
        for i, task in enumerate(last_analyzed_tasks[:3]):
            why_text = f"Ranked #{i+1} with score {task['score']}"
            if task['score'] >= 75:
                why_text += " - high priority task"
            if task.get('due_date'):
                why_text += f" due {task['due_date']}"
            if task['estimated_hours'] <= 2:
                why_text += " and low effort"
            
            top_task = {
                'id': task['id'],
                'score': task['score'],
                'priority': task['priority'],
                'why': why_text
            }
            top_tasks.append(top_task)
        
        response_data = {
            'suggested_at': timezone.now(),
            'top': top_tasks
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
