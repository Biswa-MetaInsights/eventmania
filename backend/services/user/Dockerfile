FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ARG APP_PORT=8000
ENV APP_PORT=${APP_PORT}
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${APP_PORT}"]
