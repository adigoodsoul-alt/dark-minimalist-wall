# 🖤 Dark Minimalist Interactive Wall

Интерактивная доска в реальном времени: бесконечный холст, карточки-стикеры с текстом
и картинками, синхронизация между всеми посетителями через Firebase Firestore.
Полностью статический сайт (без собственного сервера).

---

## 📁 Структура проекта

```
.
├── index.html        # Разметка страницы (структура)
├── style.css         # Все стили (CSS-переменные, адаптив)
├── app.js            # Вся логика (холст, Firebase, карточки, HEIC)
├── firestore.rules   # Правила безопасности Firestore (применяются в консоли)
├── netlify.toml      # Конфиг деплоя для Netlify (заголовки, кэш)
├── vercel.json       # Конфиг деплоя для Vercel (заголовки, кэш)
├── .gitignore        # Что не отправлять в репозиторий
└── _legacy/          # Старые версии кода (в деплой не попадают)
```

Стек: **Vanilla HTML/CSS/JS (ES6+ modules)** + **Firebase Firestore v10** + **heic2any**.
Сборка не нужна — обычная статика.

---

## 🖥️ Локальный запуск

Просто открыть `index.html` двойным кликом **не получится**: `app.js` — это ES-модуль,
и браузер заблокирует импорты и `fetch` по протоколу `file://`. Нужен локальный сервер.

**Вариант A — VS Code + расширение Live Server**
1. Установить расширение **Live Server**.
2. ПКМ по `index.html` → **Open with Live Server**.

**Вариант B — Python (если установлен)**
```bash
python -m http.server 5500
# затем открыть http://localhost:5500
```

**Вариант C — Node.js (если установлен)**
```bash
npx serve .
# или
npx http-server -p 5500
```

---

## 🚀 Деплой

### Вариант 1. Netlify — самый быстрый (без Git)

1. Зайти на <https://app.netlify.com/drop>.
2. Перетащить **всю папку проекта** в окно браузера.
3. Через 10–20 секунд получишь адрес вида `https://random-name.netlify.app`.
4. `Settings → Change site name` — задать понятное имя.

Чтобы обновлять сайт дальше, лучше подключить Git (шаг ниже).

### Вариант 2. Netlify через GitHub (рекомендуется)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Далее в Netlify: **Add new site → Import an existing project → GitHub → выбрать репозиторий**.

- **Build command:** оставить пустым
- **Publish directory:** `.` (корень)
- **Deploy** → каждое обновление `main` будет деплоиться автоматически.

### Вариант 3. Vercel через GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Далее: **vercel.com → Add New → Project → Import Git Repository**.

- **Framework Preset:** Other
- **Build Command:** пусто
- **Output Directory:** пусто (или `.`)

Vercel автоматически поддерживает `vercel.json` из репозитория.

---

## 🌐 Собственный домен

### Текущая конфигурация проекта (уже настроено)

| Параметр | Значение |
|----------|----------|
| Основной адрес | `https://семёнзаебалвыходи.space` (Punycode: `xn--80aacfkbbop1afmu5a4e1e7d.space`) |
| Резервный адрес | `https://dark-minimalist-wall.netlify.app` |
| Netlify-проект | `dark-minimalist-wall` |
| GitHub-репозиторий | `adigoodsoul-alt/dark-minimalist-wall` (ветка `main`) |
| Регистратор | REG.RU, NS: `ns1.reg.ru`, `ns2.reg.ru` |
| Способ DNS | внешний DNS (записи у регистратора), без Netlify DNS |

Записи в зоне REG.RU:

| Тип | Поддомен | Значение |
|-----|----------|----------|
| `A` | `@` | `75.2.60.5` |
| `CNAME` | `www` | `dark-minimalist-wall.netlify.app.` |

Редиректы (настраиваются Netlify автоматически): `http://` → `https://`,
`www.*` → апекс. Сертификат — Let's Encrypt, выпускается автоматически.

### Как привязать домен с нуля

1. **Project configuration → Domain management → Add a domain** → ввести домен.
2. Выбрать способ управления DNS.

**Способ A. Netlify DNS (проще, рекомендую)**
- Netlify покажет 4 адреса вида `dns1.p01.nsone.net`.
- У регистратора домена заменить текущие **NS-серверы** на эти четыре.
- Обновление занимает от 15 минут до 24 часов.

**Способ B. Внешний DNS (записи у регистратора)**

| Тип (Type) | Имя / Host | Значение (Value / Points to) | TTL  |
|------------|------------|------------------------------|------|
| `A`        | `@` (или пусто, apex-домен) | `75.2.60.5`      | 3600 |
| `CNAME`    | `www`      | `твой-сайт.netlify.app`      | 3600 |

> IP `75.2.60.5` — стандартный балансировщик Netlify. Точное значение всегда
> смотри в разделе **Domain management** — там отображается актуальный адрес.
>
> ⚠️ **REG.RU:** нельзя держать `A` и `CNAME` на одном имени (`www`). Сначала удали
> старую запись `A www`, иначе редактор зоны выдаст «неверно указано».

**Способ C. Просто CNAME на поддомен**
- `CNAME  www  твой-сайт.netlify.app`

### Vercel

1. **Project → Settings → Domains → Add** → ввести домен.
2. Выбрать способ.

**Способ A. NS-серверы Vercel**
- Прописать у регистратора: `ns1.vercel-dns.com` и `ns2.vercel-dns.com`.

**Способ B. Внешний DNS (записи у регистратора)**

| Тип (Type) | Имя / Host | Значение (Value / Points to) | TTL  |
|------------|------------|------------------------------|------|
| `A`        | `@` (apex) | `76.76.21.21`                | 3600 |
| `CNAME`    | `www`      | `cname.vercel-dns.com`       | 3600 |

> Если твой регистратор поддерживает `ALIAS`/`ANAME` — используй его вместо `A`
> для apex-домена, это надёжнее при смене IP.

### Как это выглядит у популярных регистраторов

- **REG.RU / RU-CENTER / timeweb:** раздел «DNS-серверы» (NS) или «Управление зоной» для A/CNAME.
- **Namecheap:** `Domain List → Manage → Advanced DNS` (A Record / CNAME Record).
- **GoDaddy:** `My Products → DNS → Manage Zones`.
- **Cloudflare:** `DNS → Records`. ⚠️ Если домен на Cloudflare, сначала поставь
  оранжевое облако (**Proxied**) — Netlify/Vercel обычно рекомендуют **DNS only (серое)**.

### SSL-сертификат
И Netlify, и Vercel выпускают бесплатный Let's Encrypt-сертификат автоматически после
того, как DNS начнёт указывать на хостинг. Обычно ждать 1–24 часа (пока TTL обновится).

### Частые проблемы
- Домен не «привязывается» — скорее всего ещё не истёк TTL старой записи.
- Ошибка «domain is already in use» — домен уже добавлен в другой аккаунт Netlify/Vercel.
- Прописаны только `www`, а открывается голый домен (или наоборот) — Netlify/Vercel
  предложат сделать редирект, просто нажми **Set as primary domain**.

---

## ✅ Чек-лист перед публикацией

- [ ] Проект открывается локально через локальный сервер, карточки создаются и синхронизируются.
- [ ] В Firebase Console применены правила из `firestore.rules` (иначе доступ может быть
      открыт на запись всем на 30 дней «test mode» или полностью закрыт).
- [ ] Созданная база — **Firestore Database** (не Realtime Database), коллекция `posts`.
- [ ] Проверено на телефоне: панорамирование, pinch-zoom, драг карточек, двойной тап, HEIC.
- [ ] Загружена «тяжёлая» картинка — проверить, что документ не превышает лимит 1 МиБ.

---

## 🔒 Заметки по безопасности

- `firebaseConfig` в `app.js` **можно** держать в открытом виде — это публичные ключи
  Firebase Web SDK, они не являются секретом. Реально защищает только **Security Rules**.
- Пароль администратора (`admin`) проверяется в браузере и не является защитой. Любой
  желающий может удалить карточку, вызвав `deleteDoc` из консоли. Для настоящей защиты
  нужен Firebase Auth + кастомные правила.
- Никогда не коммить service account JSON-ключи Firebase.
