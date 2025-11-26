from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .serializers import AnalyzeRequestSerializer, AnalyzeResponseSerializer, SuggestResponseSerializer
from .scoring import compute_scores
from .models import Task, TaskAnalysis


class AnalyzeTasksView(APIView):
    def post(self, request):
        serializer = AnalyzeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        strategy = serializer.validated_data['strategy']
        tasks_data = serializer.validated_data['tasks']
        
        # Convert serialized data to dict format for scoring
        task_dicts = []
        for task_data in tasks_data:
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
        
        # Store analysis
        analysis = TaskAnalysis.objects.create(strategy=strategy)
        
        response_data = {
            'analyzed_at': timezone.now(),
            'strategy': strategy,
            'tasks': scored_tasks
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class SuggestTasksView(APIView):
    def get(self, request):
        # Get latest analysis
        latest_analysis = TaskAnalysis.objects.last()
        if not latest_analysis:
            return Response(
                {'error': 'No tasks analyzed yet. Please analyze tasks first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all tasks and compute scores with latest strategy
        tasks = Task.objects.all()
        if not tasks:
            return Response(
                {'error': 'No tasks available. Please add tasks first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert to dict format
        task_dicts = []
        for task in tasks:
            task_dict = {
                'id': task.task_id,
                'title': task.title,
                'due_date': task.due_date,
                'estimated_hours': task.estimated_hours,
                'importance': task.importance,
                'dependencies': task.dependencies
            }
            task_dicts.append(task_dict)
        
        # Compute scores
        scored_tasks = compute_scores(task_dicts, latest_analysis.strategy)
        
        # Get top 3 tasks with suggestions
        top_tasks = []
        for i, task in enumerate(scored_tasks[:3]):
            why_text = f"Ranked #{i+1} with score {task['score']}"
            if task['score'] >= 75:
                why_text += " - high priority task"
            if task.get('due_date'):
                why_text += f" due {task['due_date']}"
            if task.get('estimated_hours', 0) <= 2:
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


class TaskCRUDView(APIView):
    def get(self, request):
        """Get all tasks"""
        tasks = Task.objects.all()
        task_data = []
        for task in tasks:
            task_data.append({
                'id': task.task_id,
                'title': task.title,
                'due_date': task.due_date,
                'estimated_hours': task.estimated_hours,
                'importance': task.importance,
                'dependencies': task.dependencies
            })
        return Response({'tasks': task_data}, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create or update task"""
        task_id = request.data.get('id')
        if not task_id:
            return Response({'error': 'Task ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        task, created = Task.objects.update_or_create(
            task_id=task_id,
            defaults={
                'title': request.data.get('title', ''),
                'due_date': request.data.get('due_date'),
                'estimated_hours': request.data.get('estimated_hours'),
                'importance': request.data.get('importance'),
                'dependencies': request.data.get('dependencies', [])
            }
        )
        
        action = 'created' if created else 'updated'
        return Response({'message': f'Task {action} successfully'}, status=status.HTTP_200_OK)
    
    def delete(self, request):
        """Delete task"""
        task_id = request.data.get('id')
        if not task_id:
            return Response({'error': 'Task ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            task = Task.objects.get(task_id=task_id)
            task.delete()
            return Response({'message': 'Task deleted successfully'}, status=status.HTTP_200_OK)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
