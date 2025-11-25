#!/usr/bin/env bash
set -e

echo "🔄 Atualizando código do Steeria Core a partir do GitHub..."
git pull origin main

echo "📦 Instalando dependências (se houver mudanças)..."
npm install --production

echo "🚀 Reiniciando serviço no PM2..."
pm2 restart steeria || pm2 start server.js --name steeria

echo "✅ Deploy concluído!"
