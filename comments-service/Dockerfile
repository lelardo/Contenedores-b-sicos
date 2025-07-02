FROM alpine:3.18

WORKDIR /app

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

RUN ln -sf python3 /usr/bin/python

COPY requirements.txt .

RUN pip3 install --no-cache-dir --break-system-packages flask-cors==4.0.0

COPY . .

EXPOSE 3002

CMD ["python", "app.py"]