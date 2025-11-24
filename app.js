// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const healthRoutes = require('./routes/health.routes');
const ambienteRoutes = require('./routes/ambiente.routes');

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// static (painel)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// rotas
app.use('/health', healthRoutes);
app.use('/api/ambiente', ambienteRoutes);

module.exports = app;
