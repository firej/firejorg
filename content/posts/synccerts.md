---
title: "Синхронизация сертификатов"
date: 2021-04-09T17:29:46Z
tags: ["nginx", "cron", "ssl", "https", "smart home", "home assistant"]
draft: false
---

# Как ходить по https на локальный home assitant
## 1. mikrotik

Для начала нужно настроить в своем роутере dns запись для того, чтобы вполне валидное внешнее имя резолвилось внутри сети в внутренний локальный адрес. При этом для доступа из инета - оно будет резолвится во внешний адрес

## 2. Действия на "локальном" инстансе с умным домом
Добавляем пользователя на локальной машине

```
sudo adduser syncer
```

Генерируем ssh-ключи

```
sudo su syncer
ssh-keygen -t rsa -b 4096
mv .ssh/id_rsa.pub .ssh/authorized_keys
cat .ssh/authorized_keys
```

Добавляем в файл `sudo vim /etc/cron.d/synccerts` команды синхронизации

```
0 1 */1 * * syncer scp -r remote.org:/home/syncer/remote.org /home/syncer/
0 2 */1 * * root cp -r /home/syncer/remote.org /etc/letsencrypt/live/ && chown root. -R /etc/letsencrypt/live/
```

Применяем новый конфиг
`sudo service cron reload`


## 3. Теперь удаленная машина

Добавляем такого же пользователя. И прописываем ему в authorized_keys наш созданный ранее ключ
```
sudo adduser syncer
sudo su syncer
mkdir -p .ssh
echo 'содержимое файла с локального инстанса' > .ssh/authorized_keys
```

Дальше команды в cron
`sudo vim /etc/cron.d/synccerts`

добавить строку

```
0 0 */1 * * root cp -rL /etc/letsencrypt/live/remote.org /home/syncer/ && chown syncer. -R /home/syncer/remote.org > /dev/null
```

Применяем новый конфиг
`sudo service cron reload`

