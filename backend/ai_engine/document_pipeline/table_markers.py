"""
Table Block Markers
===================
Shared sentinels used to delimit docx tables so the chunker can split them
into small row-groups.  The extractor wraps each rendered table in
``TABLE_START_MARKER`` ... ``TABLE_END_MARKER``; the chunker detects the
markers and splits rows; the cleaner must NOT strip them.
"""

TABLE_START_MARKER = "\u0001TABLE"
TABLE_END_MARKER = "\u0002"