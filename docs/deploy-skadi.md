# Deploy Skadi (Docker Swarm + Traefik + Cloudflare Tunnel)

Publica esta API na mesma VPS do `casos-front` (`vm-squad-xp-01`, 192.168.25.108).

Não reinstalar Docker, Traefik ou Portainer. Não criar outra rede: a overlay é `network_public`. O Traefik só tem o entrypoint `web` (`:80`). HTTPS fica no Cloudflare Tunnel; a origem é HTTP.

## Hostname e contrato

- Público: `https://assistant.hostsoftcom.cloud`
- Porta interna do container: `3001`
- Stack: `casos-api`
- Serviço Swarm: `casos-api_api`
- Front (`NEXT_PUBLIC_ASSISTANT_API_URL`): `https://assistant.hostsoftcom.cloud` (sem barra no final; exige rebuild da imagem do front)

Postgres e SoftFlow permanecem externos (`DATABASE_URL`, `SOFTFLOW_*`). Não há Redis nem volume neste stack.

## 1. Clone e `.env`

```bash
git clone <repo> /opt/casos-api
cd /opt/casos-api
cp .env.example .env
# preencher OPENAI_*, DATABASE_URL, SOFTFLOW_*
```

## 2. Build (imagem local)

`docker stack deploy` **não** faz build. A VM tem 1 vCPU / 4GB: `npm ci` + `tsc` pode OOM.

```bash
docker compose build
```

Se o build matar o processo por memória:

- criar swap de 2G na VPS, ou
- buildar fora e carregar a imagem:

```bash
docker save casos-api:latest | gzip > casos-api.tar.gz
# na VPS:
gunzip -c casos-api.tar.gz | docker load
```

## 3. Stack deploy

`docker stack deploy` **não** lê `.env` para interpolar labels (`TRAEFIK_HOST`, etc.).

```bash
set -a && . ./.env && set +a
docker stack deploy -c docker-compose.yml --resolve-image never casos-api
```

Conferir:

```bash
docker service ls | grep casos-api
docker service ps casos-api_api
docker service logs -f casos-api_api
```

Atualizar código ou `.env` também exige `stack deploy` de novo (o Swarm grava env na spec do serviço).

## 4. Cloudflare Zero Trust

Túnel: `vm-squad-xp-01`

- Subdomínio: `assistant`
- Domínio: `hostsoftcom.cloud`
- URL do serviço: `http://localhost:80` (Traefik)

O hostname no Traefik **tem** que ser idêntico ao do Cloudflare (`assistant.hostsoftcom.cloud`). Já houve bug com grafia diferente (`softlflow` vs `softflow`).

## 5. Teste

Na VPS, o Traefik local (não depende de DNS público):

```bash
curl -sI -H "Host: assistant.hostsoftcom.cloud" http://127.0.0.1/health
```

Se isso retornar 200 e o DNS público falhar, o problema é só a rota no Cloudflare (já aconteceu no front).

Público:

```bash
curl -sI https://assistant.hostsoftcom.cloud/health
```

Chamada interna na overlay (outros stacks em `network_public`): `http://casos-api_api:3001`. Prefira a URL HTTPS pública no front, porque parte das chamadas sai do browser.
