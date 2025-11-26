from django.test import TestCase
from datetime import date, timedelta
from .scoring import urgency_score, importance_score, effort_score, dependency_score, detect_cycles, compute_scores


class ScoringAlgorithmTests(TestCase):
    
    def test_urgency_mapping(self):
        """Test urgency score mapping for different due dates."""
        # Test tasks with different due dates
        today = date.today()
        
        tasks_today = [{'id': 't1', 'title': 'Due today', 'due_date': today, 'estimated_hours': 2, 'importance': 5, 'dependencies': []}]
        tasks_10_days = [{'id': 't2', 'title': 'Due in 10 days', 'due_date': today + timedelta(days=10), 'estimated_hours': 2, 'importance': 5, 'dependencies': []}]
        tasks_past_due = [{'id': 't3', 'title': 'Past due', 'due_date': today - timedelta(days=2), 'estimated_hours': 2, 'importance': 5, 'dependencies': []}]
        
        results_today = compute_scores(tasks_today)
        results_10_days = compute_scores(tasks_10_days)
        results_past_due = compute_scores(tasks_past_due)
        
        # Past due should have highest urgency score
        # Due today should have higher score than due in 10 days
        self.assertGreater(results_past_due[0]['score'], results_today[0]['score'])
        self.assertGreater(results_today[0]['score'], results_10_days[0]['score'])
        
        # Test urgency_score function directly
        self.assertEqual(urgency_score(None), 0.2)  # No due date
        self.assertEqual(urgency_score(0), 1.0)     # Due today
        self.assertEqual(urgency_score(-5), 1.0)    # Past due
        self.assertGreater(urgency_score(5), urgency_score(15))  # Closer due date has higher urgency
    
    def test_dependency_cycle_detection(self):
        """Test circular dependency detection and penalty application."""
        # Create tasks with circular dependency: A -> B -> C -> A
        tasks_with_cycle = [
            {'id': 'A', 'title': 'Task A', 'due_date': None, 'estimated_hours': 2, 'importance': 5, 'dependencies': ['C']},
            {'id': 'B', 'title': 'Task B', 'due_date': None, 'estimated_hours': 2, 'importance': 5, 'dependencies': ['A']},
            {'id': 'C', 'title': 'Task C', 'due_date': None, 'estimated_hours': 2, 'importance': 5, 'dependencies': ['B']}
        ]
        
        # Test cycle detection
        cycle_nodes = detect_cycles(tasks_with_cycle)
        self.assertEqual(len(cycle_nodes), 3)  # All three tasks should be in cycle
        self.assertIn('A', cycle_nodes)
        self.assertIn('B', cycle_nodes)
        self.assertIn('C', cycle_nodes)
        
        # Test penalty application
        results = compute_scores(tasks_with_cycle)
        for task in results:
            self.assertTrue(task['in_cycle'])
            self.assertIn('circular dependency detected', task['explanation'])
            # Score should be penalized (multiplied by 0.75)
        
        # Compare with non-cyclic tasks
        tasks_no_cycle = [
            {'id': 'X', 'title': 'Task X', 'due_date': None, 'estimated_hours': 2, 'importance': 5, 'dependencies': []},
            {'id': 'Y', 'title': 'Task Y', 'due_date': None, 'estimated_hours': 2, 'importance': 5, 'dependencies': ['X']},
            {'id': 'Z', 'title': 'Task Z', 'due_date': None, 'estimated_hours': 2, 'importance': 5, 'dependencies': ['Y']}
        ]
        
        results_no_cycle = compute_scores(tasks_no_cycle)
        
        # Tasks without cycles should have higher scores than equivalent tasks with cycles
        # (assuming same base parameters)
        avg_score_cycle = sum(task['score'] for task in results) / len(results)
        avg_score_no_cycle = sum(task['score'] for task in results_no_cycle) / len(results_no_cycle)
        self.assertGreater(avg_score_no_cycle, avg_score_cycle)
    
    def test_strategy_switching(self):
        """Test that different strategies produce different task orderings."""
        tasks = [
            {'id': 'urgent', 'title': 'Urgent task', 'due_date': date.today() + timedelta(days=1), 'estimated_hours': 8, 'importance': 3, 'dependencies': []},
            {'id': 'important', 'title': 'Important task', 'due_date': date.today() + timedelta(days=30), 'estimated_hours': 6, 'importance': 10, 'dependencies': []},
            {'id': 'quick', 'title': 'Quick task', 'due_date': date.today() + timedelta(days=15), 'estimated_hours': 0.5, 'importance': 4, 'dependencies': []}
        ]
        
        # Test different strategies
        fastest_wins = compute_scores(tasks, "Fastest Wins")
        high_impact = compute_scores(tasks, "High Impact")
        deadline_driven = compute_scores(tasks, "Deadline Driven")
        smart_balance = compute_scores(tasks, "Smart Balance")
        
        # Fastest Wins should prioritize the quick task
        self.assertEqual(fastest_wins[0]['id'], 'quick')
        
        # High Impact should prioritize the important task
        self.assertEqual(high_impact[0]['id'], 'important')
        
        # Deadline Driven should prioritize the urgent task
        self.assertEqual(deadline_driven[0]['id'], 'urgent')
        
        # Verify that different strategies produce different orderings
        fastest_order = [task['id'] for task in fastest_wins]
        impact_order = [task['id'] for task in high_impact]
        deadline_order = [task['id'] for task in deadline_driven]
        
        # At least one strategy should have different top task
        self.assertTrue(
            fastest_order[0] != impact_order[0] or 
            fastest_order[0] != deadline_order[0] or 
            impact_order[0] != deadline_order[0]
        )
    
    def test_scoring_components(self):
        """Test individual scoring components."""
        # Test importance score
        self.assertEqual(importance_score(1), 0.0)
        self.assertEqual(importance_score(10), 1.0)
        self.assertEqual(importance_score(5.5), 0.5)
        self.assertEqual(importance_score(None), 4/9)  # Default 5 -> (5-1)/9
        
        # Test effort score
        self.assertEqual(effort_score(0), 1.0)  # Treated as 0.5, maps to high score
        self.assertEqual(effort_score(8), 0.0)  # Maximum effort
        self.assertGreater(effort_score(2), effort_score(6))  # Lower effort = higher score
        
        # Test dependency score
        self.assertEqual(dependency_score(0), 0.0)
        self.assertEqual(dependency_score(3), 1.0)
        self.assertEqual(dependency_score(6), 1.0)  # Capped at 1.0
        self.assertEqual(dependency_score(1.5), 0.5)
    
    def test_edge_cases(self):
        """Test handling of edge cases and invalid inputs."""
        edge_case_tasks = [
            {'id': '', 'title': '', 'due_date': 'invalid-date', 'estimated_hours': -1, 'importance': 15, 'dependencies': ['nonexistent']},
            {'id': 'valid', 'title': 'Valid task'},  # Missing optional fields
        ]
        
        results = compute_scores(edge_case_tasks)
        
        # Should not crash and should handle gracefully
        self.assertEqual(len(results), 2)
        
        # Check that defaults are applied
        for task in results:
            self.assertIsNotNone(task['score'])
            self.assertIn(task['priority'], ['High', 'Medium', 'Low'])
            self.assertIsNotNone(task['explanation'])
