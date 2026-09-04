import os
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


def get_storage_upload_dir() -> str:
    """Returns absolute path to the local upload directory, ensuring it exists."""
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def save_uploaded_file(file_bytes: bytes, file_hash: str, sanitized_filename: str) -> str:
    """
    Persists uploaded file bytes to storage.
    Returns relative or canonical storage path string stored in database.
    """
    upload_dir = get_storage_upload_dir()
    storage_filename = f"{file_hash}_{sanitized_filename}"
    target_path = os.path.join(upload_dir, storage_filename)
    
    with open(target_path, "wb") as f:
        f.write(file_bytes)
        
    logger.info(f"Saved uploaded file to storage: {target_path} ({len(file_bytes)} bytes)")
    # Store standard relative-safe path
    return os.path.join(settings.UPLOAD_DIR, storage_filename).replace("\\", "/")


def read_uploaded_file(file_path: str) -> bytes:
    """
    Reads and returns raw bytes of stored document file.
    Raises FileNotFoundError if file is missing.
    """
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"Stored document file not found at '{file_path}'.")
        
    with open(abs_path, "rb") as f:
        return f.read()


def file_exists(file_path: Optional[str]) -> bool:
    """Checks whether the physical document file exists in storage."""
    if not file_path:
        return False
    return os.path.exists(os.path.abspath(file_path))


def delete_uploaded_file(file_path: Optional[str]) -> bool:
    """Safely removes physical document file from storage if present."""
    if not file_path:
        return False
    abs_path = os.path.abspath(file_path)
    if os.path.exists(abs_path):
        try:
            os.remove(abs_path)
            logger.info(f"Deleted file from storage: {abs_path}")
            return True
        except Exception as e:
            logger.warning(f"Could not delete file at '{abs_path}': {e}")
            return False
    return False


def get_file_size(file_path: Optional[str]) -> int:
    """Returns file size in bytes, or 0 if missing."""
    if not file_path:
        return 0
    abs_path = os.path.abspath(file_path)
    if os.path.exists(abs_path):
        return os.path.getsize(abs_path)
    return 0
