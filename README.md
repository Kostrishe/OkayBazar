**Backend:**

- Node.js + Express
- PostgreSQL
- JWT авторизация
- bcrypt для хэширования паролей
- Multer для загрузки изображений

**Frontend:**

- React
- Vite
- Tailwind CSS

---

### Клонирование репозитория

```bash
git clone https://github.com/username/okaybazar.git
cd okaybazar
```

### Установка зависимостей

#### Сервер:

```bash
cd server
npm install
npm install express pg cors dotenv jsonwebtoken bcryptjs multer
```

#### Клиент:

```bash
cd ../client
npm install
npm install react react-dom react-router-dom
npm install vite
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

### Настройка переменных окружения

Файл `.env` в папке `server`:

```
PORT=3001
JWT_SECRET=your_jwt_secret
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_DATABASE=okaybazar
```

Файл `.env` в папке `client`:

```
VITE_API_URL=http://localhost:3001/api
```

---

### Запуск проекта

#### Сервер:

```bash
cd server
npm run dev
```

Сервер по умолчанию работает на порту **3001**
(в API-запросах используется `http://localhost:3001/api`)

#### Клиент:

```bash
cd ../client
npm run dev
```

Клиент по умолчанию запустится на **http://localhost:5173**

---

## Done:

![Главная страница](https://imgur.com/gallery/project-bKgKQGX#WOnwSmi)
![Каталог игр](https://imgur.com/gallery/project-bKgKQGX#sYKRUA5)
![Карточка игры](https://imgur.com/gallery/project-bKgKQGX#L8mH9LX)
![Админ-панель](./screens/admin%20home.png)
![Управление играми](https://imgur.com/gallery/project-bKgKQGX#lBlv5nw)

---

## Суть проекта

ПРОЕКТ ЯВЛЯЕТСЯ УЧЕБНЫМ ПРОДУКТОМ!

Ключевые реализованные возможности:

- регистрация и авторизация пользователей (JWT + cookies)
- работа с каталогом игр (CRUD)
- корзина и оформление заказов
- система отзывов
- панель администратора для управления данными
- загрузка изображений (обложки, скриншоты)
