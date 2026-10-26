"""CLI for document service worker."""

import sys
import argparse
from typing import Any

from nova.services.document_service.schemas import DocumentServiceSettings
from nova.services.document_service.worker.queue import start_worker, get_redis_connection


def run_worker():
    """Run the RQ worker."""
    settings = DocumentServiceSettings()
    print(f"Starting document parser worker...")
    print(f"Redis: {settings.worker.redis_url}")
    print(f"Max jobs: {settings.worker.max_jobs}")
    print(f"Default timeout: {settings.worker.default_timeout}s")

    worker = start_worker(settings.worker)
    worker.work(with_scheduler=True)


def run_parser_test():
    """Test the parser with a sample file."""
    import tempfile
    from pathlib import Path

    settings = DocumentServiceSettings()
    from nova.services.document_service.parser.registry import ParserRegistry

    registry = ParserRegistry(settings.parser)

    print("Supported MIME types:", registry.list_supported_types())

    # Create a simple test PDF
    try:
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "Test PDF for NOVA Document Service")
        page.insert_text((72, 144), "This is a test document with some text.")
        doc.insert_text((72, 216), "Second page content.")

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            doc.save(tmp.name)
            tmp_path = Path(tmp.name)

        result = registry.parse_file(tmp_path, "application/pdf")
        print(f"Parsed {len(result.document.fields)} fields")
        print(f"Warnings: {result.warnings}")
        print(f"First field: {result.document.fields[0].field_name if result.document.fields else 'none'}")

        tmp_path.unlink()
    except Exception as e:
        print(f"Test failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="NOVA Document Service Worker")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("worker", help="Run RQ worker")
    subparsers.add_parser("test-parser", help="Test parser with sample file")

    args = parser.parse_args()

    if args.command == "worker":
        run_worker()
    elif args.command == "test-parser":
        run_parser_test()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()