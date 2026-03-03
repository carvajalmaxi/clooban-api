const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Setup DB
app.get('/setup-db', (req, res) => {
    exec('npx prisma db push --accept-data-loss', (error, stdout, stderr) => {
        if (error) return res.status(500).json({ status: 'error', output: stderr || error.message });
        res.json({ status: 'success', output: stdout });
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'success', message: 'Clooban API is running!', version: '2.0' });
});

// ─── USUARIOS ────────────────────────────────────────────────────────────────

// Registrar usuario
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (username, email, password)' });
        }
        const user = await prisma.user.create({
            data: { name, username, email, password }
        });
        res.json({ id: user.id, name: user.name, username: user.username, email: user.email });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'El email o usuario ya existe' });
        res.status(500).json({ error: e.message });
    }
});

// Login (básico sin JWT por ahora)
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findFirst({ where: { email, password } });
        if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        res.json({ id: user.id, name: user.name, username: user.username, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Actualizar perfil de usuario
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, bio, avatarUrl, location, instagram, spotify, website } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, bio, avatarUrl, location, instagram, spotify, website }
        });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Obtener usuario por ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { bands: true }
        });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        const { password, ...safeUser } = user;
        res.json(safeUser);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── BANDAS ──────────────────────────────────────────────────────────────────

// Listar bandas
app.get('/api/bands', async (req, res) => {
    try {
        const { q, genre } = req.query;
        const where = {};
        if (q) where.name = { contains: q, mode: 'insensitive' };
        if (genre) where.genre = genre;
        const bands = await prisma.band.findMany({ where, orderBy: { createdAt: 'desc' } });
        res.json(bands);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Ver banda por ID
app.get('/api/bands/:id', async (req, res) => {
    try {
        const band = await prisma.band.findUnique({
            where: { id: req.params.id },
            include: { posts: true }
        });
        if (!band) return res.status(404).json({ error: 'Banda no encontrada' });
        res.json(band);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Crear banda
app.post('/api/bands', async (req, res) => {
    try {
        const { name, username, bio, genre, ownerId, avatarUrl, coverUrl, website, contactEmail, location } = req.body;
        if (!name || !username || !ownerId) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (name, username, ownerId)' });
        }
        const band = await prisma.band.create({
            data: { name, username, bio, genre, ownerId, avatarUrl, coverUrl, website, contactEmail, location }
        });
        res.json(band);
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ error: 'El nombre de usuario de la banda ya existe' });
        res.status(500).json({ error: e.message });
    }
});

// Actualizar banda
app.put('/api/bands/:id', async (req, res) => {
    try {
        const { name, bio, genre, avatarUrl, coverUrl, website, contactEmail, location, instagram, spotify } = req.body;
        const band = await prisma.band.update({
            where: { id: req.params.id },
            data: { name, bio, genre, avatarUrl, coverUrl, website, contactEmail, location, instagram, spotify }
        });
        res.json(band);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POSTS ───────────────────────────────────────────────────────────────────

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            include: { band: true, likes: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(posts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎸 Clooban API v2.0 corriendo en el puerto ${PORT}`);
});
