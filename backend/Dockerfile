FROM python:3.12-slim

WORKDIR /srv/app

COPY pyproject.toml ./
COPY app ./app
COPY tests ./tests

RUN pip install --no-cache-dir .[postgres] uvicorn[standard]

ENV TAXONOMY_PATH=/srv/taxonomy/taxonomy.yaml
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
