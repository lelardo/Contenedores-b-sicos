#!/bin/bash
echo "Construyendo imágenes una por una para evitar problemas de memoria..."

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
docker build -t localhost/user-service:latest ./user-service
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
docker build --memory=512m --memory-swap=1g -t localhost/backend:latest ./backend
if [ $? -eq 0 ]; then
    echo "✅ backend construido exitosamente"
else
    echo "❌ Error construyendo backend"
fi

echo
echo "Proceso de construcción completado!"
echo "Ahora puedes crear los secrets y desplegar:"
echo "echo 'redsocial' | docker secret create postgres_db -"
echo "echo 'admina' | docker secret create postgres_user -"
echo "echo 'tupassword123' | docker secret create postgres_password -"
echo "echo 'db' | docker secret create postgres_host -"
echo "docker stack deploy -c docker-stack.yml redsocial"