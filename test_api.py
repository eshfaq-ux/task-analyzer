#!/usr/bin/env python3
"""
Quick test script to verify the task analyzer implementation.
Run this after setting up the Django environment.
"""

import json
from datetime import date, timedelta

# Test data matching the assignment example
test_payload = {
    "strategy": "Smart Balance",
    "tasks": [
        {
            "id": "t1",
            "title": "Fix login bug",
            "due_date": "2025-11-30",
            "estimated_hours": 3,
            "importance": 8,
            "dependencies": []
        },
        {
            "id": "t2",
            "title": "Write tests",
            "due_date": "2025-11-28",
            "estimated_hours": 2,
            "importance": 7,
            "dependencies": ["t1"]
        }
    ]
}

print("Test payload for POST /api/tasks/analyze/:")
print(json.dumps(test_payload, indent=2))

print("\nTo test the API:")
print("1. cd backend")
print("2. pip install -r requirements.txt")
print("3. python manage.py migrate")
print("4. python manage.py runserver")
print("5. Visit http://127.0.0.1:8000/static/index.html")
print("6. Or use curl:")
print(f"curl -X POST http://127.0.0.1:8000/api/tasks/analyze/ \\")
print(f"  -H 'Content-Type: application/json' \\")
print(f"  -d '{json.dumps(test_payload)}'")
