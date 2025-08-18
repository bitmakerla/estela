#!/usr/bin/env python3
"""
Download and extract project files for Kaniko build pipeline.
This replaces the download/extract logic from build.py.
"""

import json
import logging
import os
import shutil
import sys
from pathlib import Path
from typing import Optional
from zipfile import ZipFile

# Django is already in PYTHONPATH via Docker environment
# No need to set path since we're in /home/estela
from config.job_manager import credentials


class ProjectDownloader:
    """Handles downloading and extracting Estela projects for the build pipeline."""

    SHARED_PATH = Path("/shared")
    PROJECT_PATH = SHARED_PATH / "project"
    INFO_FILE = SHARED_PATH / "project_info.json"
    ERROR_FILE = SHARED_PATH / "error.json"
    ESTELA_DIR = ".estela"
    DOCKERFILE_NAME = "Dockerfile-estela"

    def __init__(self):
        """Initialize the downloader with environment variables."""
        self.setup_logging()

        # Parse environment variables
        key = os.getenv("KEY", "")
        if not key or "." not in key:
            raise ValueError("Invalid KEY environment variable")

        self.pid, self.did = key.split(".")
        self.bucket_name = os.getenv("BUCKET_NAME")
        self.zip_filename = f"{self.pid}.zip"

        logging.info(
            f"Initialized downloader for project {self.pid}, deploy {self.did}"
        )

    def setup_logging(self):
        """Configure clean logging format."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    def download_project(self) -> Path:
        """Download project ZIP from S3."""
        logging.info(f"Downloading project from S3 bucket: {self.bucket_name}")

        try:
            credentials.download_project(self.bucket_name, self.zip_filename)
            zip_path = Path(self.zip_filename)

            if not zip_path.exists():
                raise FileNotFoundError(f"Downloaded file not found: {self.zip_filename}")

            file_size = zip_path.stat().st_size / (1024 * 1024)  # MB
            logging.info(f"✓ Downloaded {self.zip_filename} ({file_size:.2f} MB)")

            return zip_path

        except Exception as e:
            logging.error(f"✗ Download failed: {str(e)}")
            raise

    def find_project_root(self, zip_path: Path) -> Optional[str]:
        """
        Analyze ZIP structure to find the project root directory.
        Returns the directory name if there's a single root, None otherwise.
        """
        with ZipFile(zip_path, 'r') as zip_file:
            # Get all paths in the ZIP
            namelist = zip_file.namelist()

            if not namelist:
                raise ValueError("ZIP file is empty")

            # Find unique root directories
            root_dirs = set()
            for path in namelist:
                if '/' in path:  # Skip root-level files
                    root_dirs.add(path.split('/')[0])

            # Log what we found
            logging.info(f"ZIP contains {len(namelist)} files/folders")
            logging.info(f"Found {len(root_dirs)} root directories: {root_dirs}")

            # Return single root if exists
            if len(root_dirs) == 1:
                return root_dirs.pop()

            return None

    def extract_and_normalize(self, zip_path: Path) -> Path:
        """
        Extract ZIP and normalize to standard project structure.
        Always extracts to /shared/project regardless of original structure.
        """
        # Clean up any existing project directory
        if self.PROJECT_PATH.exists():
            shutil.rmtree(self.PROJECT_PATH)

        # Create shared directory
        self.SHARED_PATH.mkdir(exist_ok=True)

        # Find the project root in ZIP
        project_root = self.find_project_root(zip_path)

        with ZipFile(zip_path, 'r') as zip_file:
            if project_root:
                # Single root directory - extract and move contents
                logging.info(f"Extracting project from '{project_root}' directory")

                # Extract to temp location
                temp_path = self.SHARED_PATH / "temp_extract"
                zip_file.extractall(temp_path)

                # Move the actual project directory to standardized location
                source = temp_path / project_root
                shutil.move(str(source), str(self.PROJECT_PATH))

                # Clean up temp directory
                shutil.rmtree(temp_path)

            else:
                # Multiple roots or files in root - extract directly
                logging.info("Extracting project directly (no single root directory)")
                zip_file.extractall(self.PROJECT_PATH)

        logging.info(f"✓ Project extracted to {self.PROJECT_PATH}")
        return self.PROJECT_PATH

    def validate_project(self) -> None:
        """Ensure the project has required Estela files."""
        estela_dir = self.PROJECT_PATH / self.ESTELA_DIR
        dockerfile = estela_dir / self.DOCKERFILE_NAME

        # Check for .estela directory
        if not estela_dir.exists():
            raise FileNotFoundError(
                f"Missing {self.ESTELA_DIR} directory. "
                "Please ensure your project is properly configured for Estela."
            )

        # Check for Dockerfile
        if not dockerfile.exists():
            raise FileNotFoundError(
                f"Missing {self.DOCKERFILE_NAME} in {self.ESTELA_DIR} directory. "
                "Please run 'estela init' in your project."
            )

        # Log project structure for debugging
        logging.info("✓ Project validation successful")
        logging.info(f"  - Found {self.ESTELA_DIR} directory")
        logging.info(f"  - Found {self.DOCKERFILE_NAME}")

        # Optional: Log project structure
        self._log_project_structure()

    def _log_project_structure(self):
        """Log the project structure for debugging."""
        try:
            # Count files by type
            py_files = list(self.PROJECT_PATH.rglob("*.py"))
            txt_files = list(self.PROJECT_PATH.rglob("*.txt"))

            logging.info("Project structure:")
            logging.info(f"  - Python files: {len(py_files)}")
            logging.info(f"  - Text files: {len(txt_files)}")

            # Check for common Scrapy files
            if (self.PROJECT_PATH / "scrapy.cfg").exists():
                logging.info("  - Found scrapy.cfg (Scrapy project)")

            # List top-level directories
            dirs = [d.name for d in self.PROJECT_PATH.iterdir() if d.is_dir()]
            logging.info(f"  - Directories: {', '.join(dirs[:5])}")

        except Exception as e:
            logging.debug(f"Could not log project structure: {e}")

    def save_metadata(self) -> None:
        """Save project information for subsequent containers."""
        metadata = {
            "pid": self.pid,
            "did": self.did,
            "project_path": str(self.PROJECT_PATH),
            "dockerfile_path": str(self.PROJECT_PATH / self.ESTELA_DIR / self.DOCKERFILE_NAME),
            "extraction_timestamp": os.environ.get("HOSTNAME", "unknown"),
            "status": "ready"
        }

        with open(self.INFO_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)

        logging.info(f"✓ Metadata saved to {self.INFO_FILE}")

    def save_error(self, error: Exception) -> None:
        """Save error information for debugging."""
        error_data = {
            "status": "failed",
            "error": str(error),
            "error_type": type(error).__name__,
            "pid": self.pid,
            "did": self.did
        }

        with open(self.ERROR_FILE, 'w') as f:
            json.dump(error_data, f, indent=2)

        logging.error(f"✗ Error details saved to {self.ERROR_FILE}")

    def cleanup(self, zip_path: Path) -> None:
        """Clean up temporary files."""
        if zip_path.exists():
            zip_path.unlink()
            logging.info("✓ Cleaned up ZIP file")

    def run(self) -> None:
        """Main execution flow."""
        zip_path = None

        try:
            logging.info("=" * 50)
            logging.info(f"Starting download for deploy {self.pid}.{self.did}")
            logging.info("=" * 50)

            # Step 1: Download
            zip_path = self.download_project()

            # Step 2: Extract and normalize
            self.extract_and_normalize(zip_path)

            # Step 3: Validate
            self.validate_project()

            # Step 4: Save metadata
            self.save_metadata()

            # Step 5: Cleanup
            self.cleanup(zip_path)

            logging.info("=" * 50)
            logging.info("✓ Project ready for Kaniko build")
            logging.info("=" * 50)

        except Exception as e:
            logging.error(f"Pipeline failed: {str(e)}")
            self.save_error(e)

            # Cleanup on error
            if zip_path and zip_path.exists():
                self.cleanup(zip_path)

            sys.exit(1)


def main():
    """Entry point for the downloader container."""
    downloader = ProjectDownloader()
    downloader.run()


if __name__ == "__main__":
    main()