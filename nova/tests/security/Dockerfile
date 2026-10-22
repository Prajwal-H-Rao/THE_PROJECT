# The image of the database isolation tests. It holds the pinned test dependencies.
# The compose service mounts the repository, so the test reads the spec and the init script.
FROM python:3.12-slim@sha256:cb33f7f771ecec2ef1225cf39b159591a040391bd73e4c01f00fdfc4c47611d2

WORKDIR /app
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
USER 1000:1000
CMD ["python", "-m", "pytest", "-q", "-p", "no:cacheprovider", "nova/tests/security/test_database_isolation.py", "nova/tests/security/test_object_prefix_isolation.py"]
