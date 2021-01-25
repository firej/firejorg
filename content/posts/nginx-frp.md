---
title: "Настройка fast reverse proxy для умного дома"
tags: ["nginx", "frp", "fast reverse proxy", "smart home", "home assistant"]
date: 2021-01-24T17:59:43Z
---

Захотелось мне вот получить доступ к локальному home assistant с работы. Подсказали использовать для этого frp (https://github.com/fatedier/frp). Вот что из этого получилось.
Качаем релиз frp, складываем все, например, в `/opt/frp`.
Конфиг клиента `frpc.ini`:

```
[common]
server_addr = your.frp.server.org
server_port = 7000
token={{server token}} # например 'openssl rand -hex 48'
[python]
type = tcp
local_ip = 127.0.0.1
local_port = 8123
remote_port = 10000
use_encryption = true
use_compression = true
# заодно пробросили и ssh
[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = 22
remote_port = 10001
use_encryption = true
use_compression = true
```

Дальше конфиг сервера, он весьма похож `frps.ini`:

```
[common]
bind_port = 7000
token = {{server token}}
allow_ports = 10000-10100
dashboard_addr = 0.0.0.0 # Ну это если так уж нужен дашборд
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = admin
```

В принципе этого уже достаточно для того чтобы попробовать. Надо запустить сервер и клиент `./frps -c ./frps.ini и ./frpc -c ./frpc.ini`.

Теперь чтобы они запускали сами как сервисы, сделаем конфиги systemd:

```
# cat /etc/systemd/system/frp.server.service
[Unit]
Description=frp server service
After=network-online.target
[Service]
Type=simple
User={{your username}}
ExecStart=/opt/frp/frps -c "/opt/frp/frps.ini" # server
# ExecStart=/opt/frp/frpc -c "/opt/frp/frpc.ini" # client
Restart=always
[Install]
WantedBy=multi-user.target
```

Включаем и запускаем сервисы (аналогично для клиента)

```
sudo systemctl enable frp.server.service
sudo systemctl start frp.server.service
sudo systemctl status frp.server.service
```

Вишенкой на торте - доступ к home assistant по нормальному dns имени. Для этого можно использовать nginx (он все равно там уже стоял).

```
# cat /etc/nginx/sites-enabled/your.ha.server.org.conf
upstream serverorg_haproxy {
    server 127.0.0.1:10000;
}
server {
    server_name your.ha.server.org;
    listen [::]:80;
    location / {
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
        proxy_pass http://serverorg_haproxy;
    }
}
```

Ну и можно закрыть доступ мимо nginx'а, но пока мне это не требовалось.

