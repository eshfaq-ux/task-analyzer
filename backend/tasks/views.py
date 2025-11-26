from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .serializers import AnalyzeRequestSerializer, AnalyzeResponseSerializer, SuggestResponseSerializer

# In-memory storage for last analyzed tasks
last_analyzed_tasks = None


class AnalyzeTasksView(APIView):
    def post(self, request):
        serializer = AnalyzeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement scoring logic
        response_data = {
            'analyzed_at': timezone.now(),
            'strategy': serializer.validated_data['strategy'],
            'tasks': []  # Will be populated with scoring logic
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
        
        # TODO: Return top 3 suggestions
        response_data = {
            'suggested_at': timezone.now(),
            'top': []  # Will be populated with top 3 tasks
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
