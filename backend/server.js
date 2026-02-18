require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { handleStripeWebhook } = require('./controllers/webhookController'); // Certifique-se que o nome do arquivo está correto (webhookController ou paymentController)

// --- Importação das Rotas ---
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const configRoutes = require('./routes/configRoutes'); // <--- NOVA ROTA

const app = express();

// --- 1. Webhook do Stripe (ANTES do express.json) ---
// O Stripe precisa do corpo "raw" (cru) para validar a assinatura de segurança
// Se passar pelo express.json(), a assinatura falha.
app.post(
    '/api/stripe/webhook', 
    express.raw({ type: 'application/json' }), 
    handleStripeWebhook
);

// --- 2. Configuração de CORS (LIBERADA GERAL) ---
// Resolve problemas de conexão entre Frontend (Vercel/Localhost) e Backend
app.use(cors({
    origin: '*', // Aceita requisições de qualquer origem
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// --- 3. Middlewares Padrão ---
app.use(express.json()); // Processa JSON para todas as outras rotas
app.use(express.urlencoded({ extended: true }));

// Pasta de uploads (para ambiente local)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 4. Registro das Rotas da API ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes); // <--- REGISTRO DA ROTA DE CONFIG

// Rota de Teste (Health Check)
app.get('/', (req, res) => {
    res.send('API Vibz Funcionando 🚀 (Rotas de Configuração Ativas)');
});

// Tratamento de Rota Não Encontrada (404)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Rota não encontrada.' });
});

// --- 5. Inicialização do Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Endpoint de configs: http://localhost:${PORT}/api/config/prices`);
});