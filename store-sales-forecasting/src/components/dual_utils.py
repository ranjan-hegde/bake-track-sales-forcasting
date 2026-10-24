"""
Shared utilities for the new dual-model pipeline.
This module avoids importing from src.utils (which depends on darts).
"""
import sys
import os
import logging

# --- Custom Exception ---
def error_message_detail(error):
    _, _, exc_tb = sys.exc_info()
    if exc_tb is not None:
        filename = exc_tb.tb_frame.f_code.co_filename
        lineno = exc_tb.tb_lineno
        error_message = "Error in line [{}], file [{}]: [{}]".format(lineno, filename, error)
    else:
        error_message = str(error)
    return error_message


class CustomException(Exception):
    def __init__(self, error_message):
        super().__init__(error_message)
        self.error_message = error_message_detail(error=error_message)

    def __str__(self):
        return self.error_message


# --- Logger ---
log_dir = os.path.join(os.getcwd(), "logs")
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    filename=os.path.join(log_dir, "running_logs.log"),
    level=logging.INFO,
    format="[%(asctime)s: %(levelname)s: %(module)s: %(message)s]"
)

logger = logging.getLogger(__name__)
