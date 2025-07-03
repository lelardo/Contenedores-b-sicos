echo "Codificando claves de la base de datos..."

docker secret create postgres_db postgres_db.txt
docker secret create postgres_user postgres_user.txt
docker secret create postgres_password postgres_password.txt

echo "Claves de la base de datos codificadas exitosamente!"
