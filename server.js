// server.js – Steeria Core oficial (limpo)

// =========================
// IMPORTS E CONFIG
// =========================
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// MIDDLEWARES
// =========================
app.use(cors());
app.use(express.json());

// pasta para arquivos estáticos (dashboards)
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// =========================
// ESTADO / CONFIG SALAS
// =========================
const SALAS_VALIDAS = ["SG_01", "SV_02", "SF_03", "SC_04"];

// último dado em memória por sala
const estadoSalas = {};
// histórico simples em memória por sala
const historicoSalas = {};

// registra em memória (rápido pra /status e /historico)
function registraLeitura(sala, dados) {
  if (!historicoSalas[sala]) historicoSalas[sala] = [];
  historicoSalas[sala].push(dados);

  // limita histórico a 200 pontos em memória
  if (historicoSalas[sala].length > 200) {
    historicoSalas[sala].shift();
  }

  estadoSalas[sala] = dados;
}

// carrega histórico a partir do arquivo JSON de uma sala
function carregarHistoricoSala(sala) {
  const filePath = `./data/ambiente_${sala}.json`;
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const dados = JSON.parse(fs.readFileSync(filePath));
    return Array.isArray(dados) ? dados : [];
  } catch (e) {
    console.error(`Erro ao ler histórico da sala ${sala}:`, e);
    return [];
  }
}

// =========================
// ROTAS BÁSICAS
// =========================

// health básico
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    servico: "Steeria Core",
    versao: "1.0.0",
    uptime: process.uptime(),
    salasComMemoria: Object.keys(estadoSalas),
    porta: PORT,
  });
});

// raiz – serve o painel (index.html em /public)
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// =========================
// INGESTÃO DE AMBIENTE
// =========================
//
// Body esperado:
// {
//   "sala": "SF_03",
//   "temperatura": 26.8,
//   "umidade": 60,
//   "vpd": 1.0,                       // opcional
//   "origem": "Tuya_SF_03",
//   "timestamp": "2025-11-14T10:27:39Z", // opcional
//   "bateria_sensor": "high",
//   "sensor_online": true
// }

app.post("/ingest/ambiente", (req, res) => {
  try {
    const {
      timestamp,
      temperatura,
      umidade,
      vpd,
      sala,
      origem,
      bateria_sensor,
      sensor_online,
    } = req.body || {};

    // validações básicas
    if (!sala || !SALAS_VALIDAS.includes(sala)) {
      return res.status(400).json({ erro: "Código de sala inválido." });
    }

    if (typeof temperatura !== "number" || typeof umidade !== "number") {
      return res.status(400).json({
        erro: "temperatura e umidade devem ser números.",
      });
    }

    const registro = {
      timestampOrigem: timestamp || null,
      timestampServidor: new Date().toISOString(),
      sala,
      temperatura,
      umidade,
      vpd: vpd != null ? vpd : null,
      origem: origem || "desconhecida",
      bateria_sensor: bateria_sensor || null,
      sensor_online:
        typeof sensor_online === "boolean" ? sensor_online : true,
    };

    console.log("📥  Recebido AMBIENTE:", JSON.stringify(registro, null, 2));

    // atualiza memória
    registraLeitura(sala, registro);

    // garante pasta data/
    if (!fs.existsSync("./data")) {
      fs.mkdirSync("./data");
    }

    // grava em arquivo por sala
    const filePath = `./data/ambiente_${sala}.json`;
    let dadosExistentes = [];
    if (fs.existsSync(filePath)) {
      try {
        dadosExistentes = JSON.parse(fs.readFileSync(filePath));
        if (!Array.isArray(dadosExistentes)) dadosExistentes = [];
      } catch (e) {
        console.error("Erro ao ler arquivo de histórico, recriando:", e);
        dadosExistentes = [];
      }
    }

    dadosExistentes.push(registro);
    if (dadosExistentes.length > 500) {
      dadosExistentes.shift();
    }

    fs.writeFileSync(filePath, JSON.stringify(dadosExistentes, null, 2));

    res.json({
      status: "ok",
      recebido: registro,
    });
  } catch (e) {
    console.error("❌ ERRO /ingest/ambiente:", e);
    res.status(500).json({ erro: "Falha ao processar ingestão." });
  }
});

// =========================
// STATUS E HISTÓRICO (MEMÓRIA)
// =========================

// último estado da sala (em memória)
app.get("/status/:sala", (req, res) => {
  const sala = req.params.sala;

  if (!SALAS_VALIDAS.includes(sala)) {
    return res.status(400).json({ error: "Sala inválida." });
  }

  const status = estadoSalas[sala];
  if (!status) {
    return res.status(404).json({ error: "Sala sem dados ainda." });
  }

  res.json(status);
});

// histórico da sala (em memória)
app.get("/historico/:sala", (req, res) => {
  const sala = req.params.sala;

  if (!SALAS_VALIDAS.includes(sala)) {
    return res.status(400).json({ error: "Sala inválida." });
  }

  res.json(historicoSalas[sala] || []);
});

// =========================
// API DE AMBIENTE PARA O PAINEL (ARQUIVOS JSON)
// =========================

// Último registro de cada sala (para o painel)
app.get("/api/ambiente/latest", (req, res) => {
  const resultado = {};

  SALAS_VALIDAS.forEach((sala) => {
    const arquivo = `./data/ambiente_${sala}.json`;

    if (!fs.existsSync(arquivo)) {
      resultado[sala] = null;
      return;
    }

    try {
      const bruto = fs.readFileSync(arquivo);
      const dados = JSON.parse(bruto);
      const historico = Array.isArray(dados) ? dados : [];
      resultado[sala] =
        historico.length > 0 ? historico[historico.length - 1] : null;
    } catch (e) {
      console.error(`Erro ao ler latest da sala ${sala}:`, e);
      resultado[sala] = null;
    }
  });

  res.json({
    atualizadoEm: new Date().toISOString(),
    salas: resultado,
  });
});

// Histórico completo da sala a partir do arquivo JSON
app.get("/api/ambiente/:sala", (req, res) => {
  const sala = req.params.sala;
  const arquivo = `./data/ambiente_${sala}.json`;

  // aqui NÃO validamos SALAS_VALIDAS pra permitir prefixos livres no futuro se precisar
  if (!fs.existsSync(arquivo)) {
    return res.json({
      sala,
      total: 0,
      dados: [],
    });
  }

  try {
    const bruto = fs.readFileSync(arquivo);
    const dados = JSON.parse(bruto);
    const historico = Array.isArray(dados) ? dados : [];

    res.json({
      sala,
      total: historico.length,
      dados: historico,
    });
  } catch (e) {
    console.error("Erro ao ler /api/ambiente/:sala", e);
    res.status(500).json({ erro: "Falha ao ler histórico da sala." });
  }
});

// =========================
// START DO SERVIDOR
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Steeria Core rodando em http://0.0.0.0:${PORT}`);
});
