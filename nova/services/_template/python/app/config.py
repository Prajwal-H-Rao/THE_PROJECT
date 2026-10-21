"""Hold the service settings. The environment supplies the values."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Hold the settings of one service."""

    model_config = SettingsConfigDict(env_prefix="NOVA_", extra="ignore")

    service_name: str = "service-template"
    log_level: str = "INFO"
    port: int = 8000
