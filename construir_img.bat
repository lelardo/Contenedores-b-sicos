@echo off
echo Construyendo imágenes localmente...

echo Construyendo backend...
docker build -t localhost/backend:latest ./backend

echo Construyendo user-service...
docker build -t localhost/user-service:latest ./user-service

echo Construyendo posts-service...
docker build -t localhost/posts-service:latest ./posts-service

echo Construyendo comments-service...
docker build -t localhost/comments-service:latest ./comments-service

echo Construyendo messages-service...
docker build -t localhost/messages-service:latest ./messages-service

echo Construyendo frontend...
docker build -t localhost/frontend:latest ./frontend

echo.
echo ¡Imágenes construidas exitosamente!
echo Ahora puedes desplegar con: docker stack deploy -c docker-stack.yml redsocial

pause

