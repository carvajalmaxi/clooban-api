const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- USUARIOS ---
app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password, name } = req.body;
        const user = await prisma.user.create({
            data: { username, email, password, name }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { username: req.params.username },
            include: { bands: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- BANDAS ---
app.post('/api/bands', async (req, res) => {
    try {
        const { name, username, bio, genre, ownerId } = req.body;
        const band = await prisma.band.create({
            data: { name, username, bio, genre, ownerId }
        });
        res.json(band);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- POSTS ---
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            include: { band: true, likes: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Clooban API corriendo en el puerto ${PORT}`);
});
