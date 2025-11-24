// server.js
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Steeria Core rodando em http://0.0.0.0:${PORT}`);
});
