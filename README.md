# Task Analyzer — Smart Task Prioritization

## Overview
This mini-application analyzes and ranks tasks using urgency, importance, effort, and dependencies. The goal is to provide the top 3 actionable tasks and a full prioritized list with explanations.

## Features
- POST /api/tasks/analyze/ — analyze a list of tasks and return scores
- GET /api/tasks/suggest/ — return top 3 task suggestions with explanations
- Frontend: single-page HTML/CSS/JS for input and results
- Configurable sorting strategies: Fastest Wins, High Impact, Deadline Driven, Smart Balance
- Circular dependency detection and penalty
- Unit tests for scoring logic

## Algorithm (350 words)
The scoring algorithm computes a base score by combining four normalized sub-scores: Urgency (U), Importance (I), Effort (E), and Dependency impact (D). Urgency maps days until due into a 0–1 range where tasks due sooner score higher and past-due tasks receive the maximum urgency. The urgency function uses a linear mapping where tasks due within 30 days receive proportionally higher scores, with past-due tasks getting the maximum score of 1.0. The 30-day window was chosen to balance sprint planning (2 weeks) and monthly cycles while preventing distant deadlines from dominating scores. Tasks without due dates receive a neutral score of 0.2.

Importance is normalized from the user-provided 1–10 scale to 0–1 using the formula (importance-1)/9. Effort is inverted so that lower estimated hours yield higher scores to favor quick wins, using the formula max(0, min(1, (8-hours)/8)) where tasks requiring 8+ hours get zero effort score. The 8-hour threshold represents a typical workday and encourages breaking large tasks into smaller chunks. Dependency impact is calculated by counting how many other tasks are blocked by the given task and normalizing with a soft cap at 3 blocked tasks to prevent single bottleneck tasks from dominating the entire priority queue.

We combine these subscores using configurable weights (default: urgency 35%, importance 30%, effort 20%, dependency 15%) to obtain a base score in 0–1. If a task participates in a circular dependency, detected using depth-first search with white/gray/black coloring, it receives a 25% penalty on the base score to surface the issue rather than hide it. The final score is scaled to 0–100 and labeled High/Medium/Low using thresholds (>=75 high, 50–75 medium, <50 low).

The algorithm is intentionally deterministic and modular: each subscore function is pure and easy to test. Strategy presets (Fastest Wins, High Impact, Deadline Driven) swap weights to change prioritization focus. Ties are resolved by importance (higher first), earlier due date, smaller estimated hours, and stable id ordering to ensure consistent results across runs.

## Validation & Edge Cases
- Missing titles are handled gracefully (empty string accepted)
- Invalid dates are treated as missing due_date (neutral urgency 0.2)
- Missing or zero estimated_hours treated as 0.5 hours
- Negative estimated_hours treated as 0.5 hours
- Unknown dependency ids are filtered out during cycle detection
- Importance values are clamped to 1-10 range with default of 5
- Out-of-range importance (e.g., 15) is clamped to 10
- Empty task list returns empty result array
- Circular dependencies detected via DFS and penalized by 25%
- Past-due tasks receive maximum urgency score (1.0)

## Setup

### Prerequisites
- Python 3.8+
- pip

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd task-analyzer

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

### Frontend Setup
The frontend is served as static files by Django. Once the server is running, visit:
- Frontend UI: http://127.0.0.1:8000/ (redirects to /static/index.html)
- API endpoints: http://127.0.0.1:8000/api/tasks/analyze/ and http://127.0.0.1:8000/api/tasks/suggest/

## API Usage

### POST /api/tasks/analyze/
```json
{
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
```

### GET /api/tasks/suggest/
Returns top 3 suggestions from the last analyzed task set.

## Tests
```bash
# Run Django tests
cd backend
python manage.py test

# Run with pytest (alternative)
pytest
```

## Design Decisions & Trade-offs

### Architecture Choices
- **Database persistence**: Django ORM with SQLite for task storage and analysis history
- **Pure functions**: Scoring logic is separated into pure functions for easy testing and modularity
- **DRF integration**: Used Django REST Framework for clean API structure and validation
- **Static frontend**: Simple HTML/CSS/JS without frameworks to minimize complexity

### Algorithm Design
- **Weight defaults**: Balanced approach with slight urgency bias (35%) to encourage timely completion
- **Cycle penalty**: 25% reduction rather than exclusion to maintain visibility of problematic tasks
- **Tie-breaker logic**: Multi-level sorting ensures deterministic results
- **Soft caps**: Dependency scoring uses soft caps to prevent extreme skewing

### Validation Strategy
- **Graceful degradation**: Invalid inputs are handled with safe defaults rather than errors
- **Explicit explanations**: Each task includes human-readable explanation of its score

### Performance & Limitations
- **Time complexity**: O(V+E) for cycle detection, O(n log n) for sorting
- **Recommended task limit**: <1000 tasks per analysis for optimal performance
- **Database**: SQLite used for development; consider PostgreSQL for production with concurrent users
- **No authentication**: Current implementation has no user isolation (by design for assignment scope)

## Future Improvements
- **Dependency graph visualization**: Use cytoscape.js or D3.js for interactive dependency graphs
- **Date intelligence**: Smart parsing of relative dates ("tomorrow", "next week")
- **Learning feedback loop**: Track user task completion and adjust importance multipliers
- **Eisenhower Matrix view**: Render tasks in urgency vs importance quadrants
- **Batch operations**: Support for bulk task updates and historical analysis
- **Export functionality**: CSV/JSON export of analysis results
- **Real-time updates**: WebSocket integration for collaborative task management

## Time Breakdown
- Project setup and structure: 30 minutes
- Scoring algorithm implementation: 90 minutes
- API endpoints and serializers: 45 minutes
- Frontend development: 60 minutes
- Unit tests: 45 minutes
- Documentation and README: 30 minutes
- **Total: ~5 hours**

## Repository Structure
```
task-analyzer/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── task_analyzer/            # Django project
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── tasks/                    # Django app
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── scoring.py
│       ├── urls.py
│       ├── tests.py
│       └── migrations/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── README.md
```
