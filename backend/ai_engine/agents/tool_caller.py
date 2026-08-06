"""
Tool Calling Agent
===================
LangGraph node that executes database query tools.

Currently implements these tools:
  - get_student_attendance: Query student's attendance percentage
  - get_student_courses: Query enrolled courses
  - get_active_notices: Query recent notices
  - get_upcoming_deadlines: Query tasks due soon
  - get_faculty_contact: Query faculty info
  - get_timetable: Placeholder (not yet implemented in DB)
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, Optional

from ai_engine.core.logging import Timer, get_logger
from ai_engine.schemas.agent_state import AgentState, UserContext
from ai_engine.schemas.response import ToolResult

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = get_logger(__name__)


def _execute_tool(
    tool_name: str,
    user_context: UserContext,
    db: "Session",
) -> Dict[str, Any]:
    """
    Route to the appropriate tool function and execute it.

    Returns a dict with the tool result data.
    Raises exceptions on failure (caught by the node).
    """
    import sys
    import os
    src_dir = os.path.join(os.path.dirname(__file__), "..", "..", "src")
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    from models import Student, Faculty, Task, Department

    student_id = user_context.get("student_id")
    role = user_context.get("role")

    if tool_name == "get_student_attendance":
        if role != "student" or not student_id:
            return {"error": "Tool only available for students"}
        
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {"error": "Student record not found"}

        return {
            "attendance_percentage": float(student.attendance_percentage or 0.0),
            "semester": student.semester,
            "status": "ok" if float(student.attendance_percentage or 0) >= 75 else "low",
        }

    elif tool_name == "get_student_courses":
        if role != "student" or not student_id:
            return {"error": "Tool only available for students"}

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student or not student.course:
            return {"courses": []}

        return {
            "course_name": student.course.name,
            "course_code": student.course.code,
            "department": student.department.name if student.department else "Unknown",
            "semester": student.semester,
        }

    elif tool_name == "get_active_notices":
        # Fetch recent notices (last 30 days) — assumes a notices/announcements table exists
        # For now return placeholder
        return {
            "notices": [],
            "message": "Notice board feature under development",
        }

    elif tool_name == "get_upcoming_deadlines":
        if role != "student" or not student_id:
            return {"error": "Tool only available for students"}

        from datetime import datetime, timedelta
        upcoming = db.query(Task).filter(
            Task.assigned_to == student_id,
            Task.due_date >= datetime.utcnow(),
            Task.due_date <= datetime.utcnow() + timedelta(days=14),
            Task.is_active == True,
        ).order_by(Task.due_date).limit(10).all()

        return {
            "deadlines": [
                {
                    "title": t.title,
                    "type": t.task_type.value if hasattr(t.task_type, 'value') else str(t.task_type),
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "priority": t.priority.value if hasattr(t.priority, 'value') else str(t.priority),
                }
                for t in upcoming
            ],
        }

    elif tool_name == "get_faculty_contact":
        dept_name = user_context.get("department")
        if not dept_name:
            return {"faculty": []}

        dept = db.query(Department).filter(Department.name == dept_name).first()
        if not dept:
            return {"faculty": []}

        faculty_list = db.query(Faculty).filter(
            Faculty.department_id == dept.id,
            Faculty.is_active == True,
        ).limit(20).all()

        return {
            "faculty": [
                {
                    "name": f"{f.first_name} {f.last_name}",
                    "designation": f.designation,
                    "specialization": f.specialization,
                    "email": f.email,
                    "phone": f.phone,
                }
                for f in faculty_list
            ],
        }

    elif tool_name == "get_timetable":
        return {"message": "Timetable feature not yet implemented"}

    else:
        return {"error": f"Unknown tool: {tool_name}"}


def tool_call_node(state: AgentState, db: "Session") -> AgentState:
    """
    LangGraph node: Execute the suggested tool.

    Only runs when state.needs_tool is True.

    Args:
        state: Current agent state
        db: SQLAlchemy database session

    Returns:
        Updated state with tool_result populated
    """
    tool_name = state.get("suggested_tool")
    user_context = state["user_context"]
    trace_id = state.get("trace_id", "")

    if not tool_name:
        logger.warning("tool_call.no_tool", extra={"trace_id": trace_id})
        return {
            **state,
            "execution_trace": state.get("execution_trace", []) + ["tool_call(skipped)"],
        }

    logger.info(
        "tool.execute.start",
        extra={
            "event": "tool.execute.start",
            "tool_name": tool_name,
            "trace_id": trace_id,
        },
    )

    with Timer() as t:
        try:
            result_data = _execute_tool(tool_name, user_context, db)
            success = "error" not in result_data
        except Exception as e:
            logger.error("tool.execute.failed", extra={"error": str(e), "tool": tool_name})
            result_data = {"error": str(e)}
            success = False

    result = ToolResult(
        tool_name=tool_name,
        success=success,
        data=result_data if success else None,
        error=result_data.get("error") if not success else None,
        latency_ms=t.elapsed_ms,
    )

    logger.info(
        "tool.execute.done",
        extra={
            "event": "tool.execute.done",
            "tool_name": tool_name,
            "success": success,
            "latency_ms": t.elapsed_ms,
            "trace_id": trace_id,
        },
    )

    return {
        **state,
        "tool_result": result,
        "execution_trace": state.get("execution_trace", []) + [f"tool_call({tool_name})"],
    }
