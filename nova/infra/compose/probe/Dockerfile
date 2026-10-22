# The build file of the Docker probe. It proves the network rules of module 01 rule 9.
FROM python:3.12-alpine@sha256:b658b05ce9c4eb97ec6fc19424818a1f31993659c2b505a532f470e83807815d
COPY probe.py /opt/probe.py
ENTRYPOINT ["python3", "/opt/probe.py"]
