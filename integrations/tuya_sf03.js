// src/integrations/tuya_sf03.js

// Aqui no futuro vamos usar axios ou fetch pra falar com a Tuya Cloud.
// Por enquanto vamos deixar só a estrutura pronta.

async function lerTuyaSF03() {
  // TODO: aqui vamos chamar a API da Tuya com o device_id da SF_03
  // e transformar a resposta no formato padrão do Steeria.

  // Por enquanto, só devolve um dado fake de teste.
  return {
    sala: "SF_03",
    temperatura: 26.8,
    umidade: 60,
    vpd: 1.0,
    origem: "tuya:SF_03 (mock)",
    timestamp: new Date().toISOString(),
    bateria_sensor: "high",
    sensor_online: true,
  };
}

// Esta função recebe uma função de envio (que vai mandar pro /ingest/ambiente)
async function syncTuyaSF03(enviarFunc) {
  try {
    const dado = await lerTuyaSF03();
    await enviarFunc(dado);
  } catch (e) {
    console.error("Erro na integração Tuya SF_03 → Steeria:", e);
  }
}

module.exports = {
  syncTuyaSF03,
};
