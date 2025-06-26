FROM alpine:3.18

WORKDIR /app

# Instalar Python y dependencias desde paquetes del sistema Alpine
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-flask \
    py3-psycopg2 \
    py3-dotenv \
    postgresql-dev \
    gcc \
    musl-dev \
    python3-dev

# Crear symlink para python
RUN ln -sf python3 /usr/bin/python

# Copiar requirements para referencia
COPY requirements.txt .

# Instalar solo las dependencias que no están disponibles como paquetes del sistema
RUN pip3 install --no-cache-dir --break-system-packages flask-cors==4.0.0

# Copiar código
COPY . .

EXPOSE 3002

CMD ["python", "app.py"]