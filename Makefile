# Atalhos de operação da BETA (web + redis + caddy).
# Stack completa: troque COMPOSE=docker-compose.yml ou rode `make COMPOSE=docker-compose.yml up`.

COMPOSE ?= docker-compose.beta.yml
DC = docker compose -f $(COMPOSE)

.PHONY: up down restart build ps logs health ready bringup pull deploy clean

up:        ## Sobe (build) em background
	$(DC) up -d --build --remove-orphans

down:      ## Derruba os containers
	$(DC) down

restart:   ## Recria os containers
	$(DC) up -d --build --force-recreate

build:     ## Só builda as imagens
	$(DC) build

ps:        ## Status dos serviços
	$(DC) ps

logs:      ## Tail dos logs (web + caddy)
	$(DC) logs -f web caddy

health:    ## Checa /api/health de dentro do container web (liveness — NÃO toca o banco)
	$(DC) exec web node -e "fetch('http://localhost:3000/api/health').then(r=>r.text()).then(t=>{console.log(t);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"

ready:     ## Prova que o Atlas responde E que os dados estão lá (conta usuários)
	$(DC) exec -T web node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(n=>{console.log('Atlas ok —',n,'usuários');process.exit(0)}).catch(e=>{console.error('Atlas FALHOU:',e.message);process.exit(1)})"

bringup:   ## Bring-up completo numa box nova (docker, repo, .env, subir, verificar)
	bash scripts/vps-bringup.sh

pull:      ## git pull --ff-only (atualiza o código no VPS)
	git fetch --all --prune && git reset --hard origin/main

deploy:    ## pull + up (deploy manual no VPS)
	$(MAKE) pull && $(MAKE) up && docker image prune -f

clean:     ## Remove containers + volumes (CUIDADO: apaga redis_data)
	$(DC) down -v
