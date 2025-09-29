"""
Force single-threaded build to avoid rare race creating
dependency (.d) file directories on Windows.

This helps with intermittent errors like:
  fatal error: opening dependency file ... .d: No such file or directory
"""

from SCons.Script import SetOption

try:
    # Limit SCons to a single job to avoid parallel mkdir races
    SetOption("num_jobs", 1)
except Exception:
    # Best-effort; ignore if not supported in this context
    pass

