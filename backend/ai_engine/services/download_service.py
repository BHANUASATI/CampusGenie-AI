"""
Download Service
=================
Service for generating downloadable content from AI responses.
Supports PDF, CSV, and text formats for timetables, schedules, and other structured data.
"""

from __future__ import annotations

import io
import csv
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from ai_engine.core.logging import get_logger

logger = get_logger(__name__)


class DownloadService:
    """Service for generating downloadable content from AI responses."""

    def __init__(self):
        pass

    def detect_download_need(self, content: str, intent: Optional[str] = None) -> Dict[str, Any]:
        """
        Detect if the AI response content suggests a downloadable format.
        
        Args:
            content: AI response content
            intent: Detected intent from the AI engine
            
        Returns:
            Dict with download suggestions
        """
        download_suggestions = {
            "should_download": False,
            "formats": [],
            "content_type": None,
            "filename": None
        }

        # Keywords that suggest timetable/schedule data
        timetable_keywords = [
            'timetable', 'schedule', 'class schedule', 'exam schedule', 
            'routine', 'time table', 'weekly schedule', 'daily schedule',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
            '9:00', '10:00', '11:00', 'lecture', 'lab', 'period'
        ]

        # Keywords that suggest list/tabular data
        table_keywords = [
            'list of', 'following', 'courses', 'subjects', 'faculty',
            'departments', 'assignments', 'deadlines', 'exams'
        ]

        content_lower = content.lower()
        
        # Check for timetable-related content
        timetable_matches = sum(1 for keyword in timetable_keywords if keyword in content_lower)
        table_matches = sum(1 for keyword in table_keywords if keyword in content_lower)

        # Also check intent if available
        intent_lower = intent.lower() if intent else ""
        intent_timetable = any(keyword in intent_lower for keyword in timetable_keywords)
        
        # Determine if download is suggested
        if timetable_matches >= 3 or intent_timetable:
            download_suggestions["should_download"] = True
            download_suggestions["formats"] = ["pdf", "csv", "text"]
            download_suggestions["content_type"] = "timetable"
            download_suggestions["filename"] = f"timetable_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        elif table_matches >= 2:
            download_suggestions["should_download"] = True
            download_suggestions["formats"] = ["csv", "text"]
            download_suggestions["content_type"] = "table"
            download_suggestions["filename"] = f"data_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        return download_suggestions

    def generate_csv(self, content: str) -> str:
        """
        Parse content and generate CSV format.
        
        Args:
            content: AI response content
            
        Returns:
            CSV formatted string
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Try to parse structured content
        lines = content.split('\n')
        data_rows = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            # Try to split by common delimiters
            if '|' in line:
                # Markdown table format
                parts = [part.strip() for part in line.split('|')]
                parts = [p for p in parts if p]  # Remove empty strings
                if parts and not all(c == '-' for c in parts[0]):
                    data_rows.append(parts)
            elif '\t' in line:
                # Tab-separated
                data_rows.append(line.split('\t'))
            elif line.startswith('-') or line.startswith('*'):
                # Bullet list
                data_rows.append([line.lstrip('-* ').strip()])
            else:
                # Regular line - try to parse as time-based content
                time_match = re.match(r'(\d{1,2}:\d{2})\s*(.*)', line)
                if time_match:
                    data_rows.append([time_match.group(1), time_match.group(2).strip()])
                elif len(line.split(',')) >= 2:
                    # Comma-separated
                    data_rows.append([part.strip() for part in line.split(',')])
                else:
                    data_rows.append([line])
        
        # Write to CSV
        if data_rows:
            writer.writerows(data_rows)
        else:
            # Fallback: write entire content as single cell
            writer.writerow([content])
        
        return output.getvalue()

    def generate_text(self, content: str) -> str:
        """
        Generate clean text format.
        
        Args:
            content: AI response content
            
        Returns:
            Plain text string
        """
        # Clean up markdown formatting
        text = content
        
        # Remove markdown headers
        text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
        
        # Remove bold/italic markers
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        text = re.sub(r'\*(.*?)\*', r'\1', text)
        
        # Clean up table markers
        text = re.sub(r'\|', '', text)
        
        # Clean up extra whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        return text.strip()

    def generate_pdf(self, content: str) -> bytes:
        """
        Generate PDF format (placeholder - requires additional library).
        
        Args:
            content: AI response content
            
        Returns:
            PDF bytes
        """
        # For now, we'll create a simple text-based PDF
        # In production, you'd use reportlab or similar
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.units import inch
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Add title
            title = Paragraph("CampusGenie - AI Response", styles['Title'])
            story.append(title)
            story.append(Spacer(1, 0.2 * inch))
            
            # Add content (split into paragraphs)
            paragraphs = content.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    p = Paragraph(para.strip(), styles['Normal'])
                    story.append(p)
                    story.append(Spacer(1, 0.1 * inch))
            
            doc.build(story)
            return buffer.getvalue()
            
        except ImportError:
            # Fallback: return text as "PDF" (not real PDF but text content)
            logger.warning("reportlab not installed, using text fallback for PDF")
            text_content = self.generate_text(content)
            return text_content.encode('utf-8')

    def generate_download(self, content: str, format: str) -> tuple[str, str, bytes]:
        """
        Generate downloadable content in specified format.
        
        Args:
            content: AI response content
            format: Format type ('pdf', 'csv', 'text')
            
        Returns:
            Tuple of (filename, mime_type, content_bytes)
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format == 'csv':
            filename = f"campusgenie_data_{timestamp}.csv"
            mime_type = 'text/csv'
            content_bytes = self.generate_csv(content).encode('utf-8')
            
        elif format == 'text':
            filename = f"campusgenie_response_{timestamp}.txt"
            mime_type = 'text/plain'
            content_bytes = self.generate_text(content).encode('utf-8')
            
        elif format == 'pdf':
            filename = f"campusgenie_document_{timestamp}.pdf"
            mime_type = 'application/pdf'
            content_bytes = self.generate_pdf(content)
            
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        return filename, mime_type, content_bytes