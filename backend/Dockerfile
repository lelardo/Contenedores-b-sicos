FROM python:3.11-slim

WORKDIR /app

# Copiar requirements primero para aprovechar cache de Docker
COPY requirements.txt /app/

# Instalar dependencias Python con configuraciones mínimas para evitar problemas de memoria
RUN pip install --no-cache-dir --disable-pip-version-check \
    --progress-bar=off --no-color --timeout=600 \
    --retries=3 -r requirements.txt

# Copiar el resto del código
COPY . /app

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
