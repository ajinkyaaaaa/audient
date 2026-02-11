from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_NAME: str = "audient"
    JWT_SECRET: str = "secret"
    PORT: int = 3001

    class Config:
        env_file = ".env"


settings = Settings()
