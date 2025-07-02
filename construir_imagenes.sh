#!/bin/bash
echo "Construyendo imágenes de los microservicios..."

echo "Descargando imagen de PostgreSQL..."
docker pull postgres:15-alpine
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL descargado exitosamente"
else
    echo "❌ Error descargando PostgreSQL"
fi

echo "Esperando 10 segundos..."
sleep 10

echo "Construyendo user-service..."
docker build -t localhost/session-service:latest ./session-service
if [ $? -eq 0 ]; then
    echo "✅ user-service construido exitosamente"
else
    echo "❌ Error construyendo user-service"
fi

echo "Esperando 10 segundos..."
sleep 10

echo "Construyendo posts-service..."
docker build -t localhost/posts-service:latest ./posts-service
if [ $? -eq 0 ]; then
    echo "✅ posts-service construido exitosamente"
else
    echo "❌ Error construyendo posts-service"
fi

echo "Esperando 10 segundos..."
sleep 10

echo "Construyendo messages-service..."
docker build -t localhost/messages-service:latest ./messages-service
if [ $? -eq 0 ]; then
    echo "✅ messages-service construido exitosamente"
else
    echo "❌ Error construyendo messages-service"
fi

echo "Esperando 10 segundos..."
sleep 10

echo "Construyendo frontend..."
docker build -t localhost/frontend:latest ./frontend
if [ $? -eq 0 ]; then
    echo "✅ frontend construido exitosamente"
else
    echo "❌ Error construyendo frontend"
fi


echo "Esperando 15 segundos antes de construir servicios Python..."
sleep 15

echo "Construyendo comments-service con límites de memoria..."
docker build --memory=512m --memory-swap=1g -t localhost/comments-service:latest ./comments-service
if [ $? -eq 0 ]; then
    echo "✅ comments-service construido exitosamente"
else
    echo "❌ Error construyendo comments-service"
fi

echo "Esperando 15 segundos..."
sleep 15

echo "Construyendo backend con límites de memoria..."
docker build --memory=512m --memory-swap=1g -t localhost/loggin-service:latest ./loggin-service
if [ $? -eq 0 ]; then
    echo "✅ backend construido exitosamente"
else
    echo "❌ Error construyendo backend"
fi

echo
echo "Proceso de construcción completado!"

echo "Codificando claves de la base de datos..."

docker secret create postgres_db postgres_db.txt
docker secret create postgres_user postgres_user.txt
docker secret create postgres_password postgres_password.txt

echo "Claves de la base de datos codificadas exitosamente!"
