const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Путь к JSON файлу
const DATA_FILE = path.join(__dirname, 'courses.json');

app.use(express.json());

/**
 * Проверка существования файла и создание при необходимости
 */
function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
}

/**
 * Загрузка курсов из файла
 */
function loadCourses() {
    try {
        ensureDataFile();
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    } catch (error) {
        throw new Error('Ошибка чтения файла');
    }
}

/**
 * Сохранение курсов в файл
 */
function saveCourses(courses) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
    } catch (error) {
        throw new Error('Ошибка записи файла');
    }
}

/**
 * Генерация ID
 */
function getNextId(courses) {
    return courses.length > 0
        ? Math.max(...courses.map(c => c.id)) + 1
        : 1;
}

/**
 * Валидация курса
 */
function validateCourse(data) {
    const validStatuses = ["Не начато", "В процессе", "Завершено"];

    if (!data.name || !data.description || !data.target_date || !data.status) {
        return "Все поля обязательны";
    }

    if (!validStatuses.includes(data.status)) {
        return "Неверный статус";
    }

    // Проверка даты YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.target_date)) {
        return "Неверный формат даты (YYYY-MM-DD)";
    }

    return null;
}

/**
 * POST - Добавить курс
 */
app.post('/api/courses', (req, res) => {
    try {
        const courses = loadCourses();

        const error = validateCourse(req.body);
        if (error) return res.status(400).json({ error });

        const newCourse = {
            id: getNextId(courses),
            name: req.body.name,
            description: req.body.description,
            target_date: req.body.target_date,
            status: req.body.status,
            created_at: new Date().toISOString()
        };

        courses.push(newCourse);
        saveCourses(courses);

        res.status(201).json(newCourse);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET - Все курсы
 */
app.get('/api/courses', (req, res) => {
    try {
        const courses = loadCourses();
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET - Один курс
 */
app.get('/api/courses/:id', (req, res) => {
    try {
        const courses = loadCourses();
        const course = courses.find(c => c.id == req.params.id);

        if (!course) {
            return res.status(404).json({ error: "Курс не найден" });
        }

        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT - Обновить курс
 */
app.put('/api/courses/:id', (req, res) => {
    try {
        const courses = loadCourses();
        const index = courses.findIndex(c => c.id == req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: "Курс не найден" });
        }

        const updated = { ...courses[index], ...req.body };

        const error = validateCourse(updated);
        if (error) return res.status(400).json({ error });

        courses[index] = updated;
        saveCourses(courses);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE - Удалить курс
 */
app.delete('/api/courses/:id', (req, res) => {
    try {
        let courses = loadCourses();
        const filtered = courses.filter(c => c.id != req.params.id);

        if (courses.length === filtered.length) {
            return res.status(404).json({ error: "Курс не найден" });
        }

        saveCourses(filtered);
        res.json({ message: "Курс удалён" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * BONUS: Статистика
 */
app.get('/api/courses/stats', (req, res) => {
    try {
        const courses = loadCourses();

        const stats = {
            total: courses.length,
            "Не начато": 0,
            "В процессе": 0,
            "Завершено": 0
        };

        courses.forEach(c => {
            if (stats[c.status] !== undefined) {
                stats[c.status]++;
            }
        });

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Запуск сервера
 */
app.listen(PORT, () => {
    console.log(`CodeCraftHub API запущен на http://localhost:${PORT}`);
});
