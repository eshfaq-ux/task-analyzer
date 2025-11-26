from datetime import date
from typing import List, Dict, Set, Any


def urgency_score(days_left):
    """Calculate urgency score based on days until due date."""
    if days_left is None:
        return 0.2
    if days_left <= 0:
        return 1.0
    return max(0.0, min(1.0, (30 - days_left) / 30.0))


def importance_score(importance):
    """Calculate importance score from 1-10 scale to 0-1."""
    if importance is None:
        importance = 5
    importance_clamped = max(1, min(10, importance))
    return (importance_clamped - 1) / 9


def effort_score(hours):
    """Calculate effort score - lower effort gets higher score."""
    if hours is None or hours <= 0:
        hours = 0.5
    return max(0.0, min(1.0, (8 - hours) / 8.0))


def dependency_score(blocks_count):
    """Calculate dependency score based on how many tasks this blocks."""
    return min(1.0, blocks_count / 3.0)


def detect_cycles(tasks: List[Dict]) -> Set[str]:
    """Detect circular dependencies using DFS with white/gray/black coloring."""
    # Build adjacency list
    graph = {}
    task_ids = set()
    
    for task in tasks:
        task_id = task.get('id', '')
        task_ids.add(task_id)
        graph[task_id] = task.get('dependencies', [])
    
    # DFS cycle detection with proper cycle collection
    WHITE, GRAY, BLACK = 0, 1, 2
    colors = {task_id: WHITE for task_id in task_ids}
    cycle_nodes = set()
    current_path = []
    
    def dfs(node):
        if colors[node] == GRAY:  # Back edge found - cycle detected
            # Add all nodes in current path from this node onwards to cycle_nodes
            cycle_start_idx = current_path.index(node)
            for i in range(cycle_start_idx, len(current_path)):
                cycle_nodes.add(current_path[i])
            cycle_nodes.add(node)
            return True
        
        if colors[node] == BLACK:  # Already processed
            return False
            
        colors[node] = GRAY
        current_path.append(node)
        
        cycle_found = False
        for neighbor in graph.get(node, []):
            if neighbor in task_ids:  # Only check dependencies that exist in our task set
                if dfs(neighbor):
                    cycle_found = True
        
        current_path.pop()
        colors[node] = BLACK
        return cycle_found
    
    for task_id in task_ids:
        if colors[task_id] == WHITE:
            dfs(task_id)
    
    return cycle_nodes


def compute_scores(tasks: List[Dict], strategy: str = "Smart Balance") -> List[Dict]:
    """Compute scores for all tasks based on strategy."""
    if not tasks:
        return []
    
    # Strategy weights
    strategies = {
        "Smart Balance": {"w_u": 0.35, "w_i": 0.30, "w_e": 0.20, "w_d": 0.15},
        "Fastest Wins": {"w_u": 0.15, "w_i": 0.15, "w_e": 0.60, "w_d": 0.10},
        "High Impact": {"w_u": 0.25, "w_i": 0.55, "w_e": 0.05, "w_d": 0.15},
        "Deadline Driven": {"w_u": 0.70, "w_i": 0.15, "w_e": 0.05, "w_d": 0.10}
    }
    
    weights = strategies.get(strategy, strategies["Smart Balance"])
    
    # Detect cycles once for all tasks
    cycle_nodes = detect_cycles(tasks)
    
    # Pre-calculate dependency counts for better performance
    task_ids = {task.get('id', '') for task in tasks}
    dependency_counts = {task_id: 0 for task_id in task_ids}
    
    for task in tasks:
        for dep_id in task.get('dependencies', []):
            if dep_id in dependency_counts:
                dependency_counts[dep_id] += 1
    
    # Process each task
    scored_tasks = []
    today = date.today()
    
    for task in tasks:
        task_id = task.get('id', '')
        title = task.get('title', '')
        
        # Handle missing or invalid fields with optimized parsing
        due_date = task.get('due_date')
        days_left = None
        if due_date:
            try:
                if isinstance(due_date, str):
                    due_date = date.fromisoformat(due_date)
                days_left = (due_date - today).days
            except (ValueError, TypeError):
                due_date = None
        
        estimated_hours = task.get('estimated_hours')
        if estimated_hours is None or estimated_hours <= 0:
            estimated_hours = 0.5
        
        importance = task.get('importance')
        if importance is None:
            importance = 5
        importance = max(1, min(10, importance))
        
        dependencies = task.get('dependencies', [])
        
        # Calculate subscores
        U = urgency_score(days_left)
        I = importance_score(importance)
        E = effort_score(estimated_hours)
        D = dependency_score(dependency_counts.get(task_id, 0))
        
        # Calculate base score
        base = weights["w_u"] * U + weights["w_i"] * I + weights["w_e"] * E + weights["w_d"] * D
        
        # Apply circular dependency penalty
        in_cycle = task_id in cycle_nodes
        if in_cycle:
            base = base * 0.75
        
        # Final score
        final_score = round(base * 100, 2)
        
        # Priority label
        if final_score >= 75:
            priority = "High"
        elif final_score >= 50:
            priority = "Medium"
        else:
            priority = "Low"
        
        # Generate explanation
        urgency_text = "no due date"
        if days_left is not None:
            if days_left < 0:
                urgency_text = f"past due by {abs(days_left)} days"
            elif days_left == 0:
                urgency_text = "due today"
            else:
                urgency_text = f"due in {days_left} days"
        
        effort_label = "Low" if estimated_hours <= 2 else "Medium" if estimated_hours <= 5 else "High"
        
        blocks_count = dependency_counts.get(task_id, 0)
        dependency_text = f"blocks {blocks_count} tasks" if blocks_count > 0 else "blocks no tasks"
        
        explanation = f"{urgency_text}; importance {importance}/10; {effort_label} effort; {dependency_text}"
        if in_cycle:
            explanation += "; circular dependency detected"
        
        scored_task = {
            'id': task_id,
            'title': title,
            'due_date': due_date,
            'estimated_hours': estimated_hours,
            'importance': importance,
            'dependencies': dependencies,
            'score': final_score,
            'priority': priority,
            'explanation': explanation,
            'in_cycle': in_cycle
        }
        
        scored_tasks.append(scored_task)
    
    # Optimized sorting with stable sort
    scored_tasks.sort(key=lambda task: (
        -task['score'],  # Higher score first
        -task['importance'],  # Higher importance first
        task['due_date'] if task['due_date'] else date.max,  # Earlier due date first
        task['estimated_hours'],  # Lower hours first
        task['id']  # Stable sort by id
    ))
    
    return scored_tasks
