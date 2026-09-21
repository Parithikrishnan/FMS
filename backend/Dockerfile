FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 5000

# --preload: create_app() (table creation + demo seed) runs once in the master,
# not once per worker.
CMD ["gunicorn", "--preload", "--workers", "2", "--bind", "0.0.0.0:5000", "--access-logfile", "-", "app:app"]
