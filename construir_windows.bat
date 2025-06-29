@echo off
cls

echo ======================================================
echo Construyendo imagenes una por una en Windows
echo ======================================================
echo.

REM Es una buena práctica tener la imagen base de la DB descargada
echo --> Descargando imagen de PostgreSQL...
docker pull postgres:15-alpine
echo "✅ Imagen de PostgreSQL lista."
echo.

REM --- Construcción de servicios Node.js ---

echo --> Construyendo user-service...
docker build -t localhost/user-service:latest ./user-service
IF %ERRORLEVEL% NEQ 0 (
    echo "❌ Error construyendo user-service."
    goto:eof
)
echo "✅ user-service construido exitosamente."
echo.
timeout /t 5 /nobreak > nul

echo --> Construyendo posts-service...
docker build -t localhost/posts-service:latest ./posts-service
IF %ERRORLEVEL% NEQ 0 (
    echo "❌ Error construyendo posts-service."
    goto:eof
)
echo "✅ posts-service construido exitosamente."
echo.
timeout /t 5 /nobreak > nul

echo --> Construyendo messages-service...
docker build -t localhost/messages-service:latest ./messages-service
IF %ERRORLEVEL% NEQ 0 (
    echo "❌ Error construyendo messages-service."
    goto:eof
)
echo "✅ messages-service construido exitosamente."
echo.
timeout /t 5 /nobreak > nul

echo --> Construyendo frontend...
docker build -t localhost/frontend:latest ./frontend
IF %ERRORLEVEL% NEQ 0 (
    echo "❌ Error construyendo frontend."
    goto:eof
)
echo "✅ frontend construido exitosamente."
echo.
timeout /t 10 /nobreak > nul

REM --- Construcción de servicios Python (con límites de memoria) ---

echo --> Construyendo comments-service (Python)...
docker build --memory=512m --memory-swap=1g -t localhost/comments-service:latest ./comments-service
IF %ERRORLEVEL% NEQ 0 (
    echo "❌ Error construyendo comments-service."
    goto:eof
)
echo "✅ comments-service construido exitosamente."
echo.
timeout /t 10 /nobreak > nul

echo --> Construyendo backend (Django)...
docker build --memory=512m --memory-swap=1g -t localhost/backend:latest ./backend
IF %ERRORLEVEL% NEQ 0 (
    echo "❌ Error construyendo backend."
    goto:eof
)
echo "✅ backend construido exitosamente."
echo.

REM --- Instrucciones finales ---

echo ======================================================
echo "¡Proceso de construccion completado en Windows!"
echo ======================================================
echo.
echo Ahora, sube esta carpeta a tu maquina manager y ejecuta los siguientes comandos ALLA:
echo.
echo 1. Crea los secrets (si no existen):
echo    echo 'proyecto_db' ^| docker secret create postgres_db -
echo    echo 'admin' ^| docker secret create postgres_user -
echo    echo 'admin123' ^| docker secret create postgres_password -
echo.
echo 2. Despliega el stack:
echo    docker stack deploy -c docker-stack.yml redsocial
echo.
pause