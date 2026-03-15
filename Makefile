help:
	@echo 'Run "make <target>" where <target> is one of the following:'
	@echo '  dockerDev'
# 	@echo '  dockerProd'
# 	@echo '  dockerMigrate'

dockerDev-build:
	docker compose --file .docker/docker-compose-dev.yml up --build -d --quiet-pull
dockerDev:
	docker compose --file .docker/docker-compose-dev.yml up -d --quiet-pull

# dockerProd:
# 	git pull && sudo docker compose --file .docker/docker-compose.yml up pgadmin postgres nginx --build -d --quiet-pull

# dockerMigrate:
# 	sudo docker compose --file .docker/docker-compose.yml up migrate-deploy --build -d --quiet-pull
