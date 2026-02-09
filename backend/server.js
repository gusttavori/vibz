require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { handleStripeWebhook } = require('./controllers/paymentController');

// Rotas
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 

const app = express();

// --- 1. Webhook do Stripe (ANTES do express.json) ---
// O Stripe precisa do corpo "raw" (cru) para validar a assinatura de segurança
app.post(
    '/api/stripe/webhook', 
    express.raw({ type: 'application/json' }), 
    handleStripeWebhook
);

// --- 2. Configuração de CORS (LIBERADA GERAL) ---
// Resolve o problema dos links de Preview da Vercel que mudam toda hora.
// Agora o Backend aceita requisições de qualquer origem.
app.use(cors({
    origin: '*', // Aceita tudo (Vercel, Localhost, Postman, Mobile)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true // Permite cookies/sessões se necessário
}));

// --- 3. Middlewares Padrão ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Pasta de uploads (apenas para fallback local, em produção usamos Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 4. Rotas da API ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rota de Teste (Health Check)
app.get('/', (req, res) => {
    res.send('API Vibz Funcionando 🚀 (CORS Liberado)');
});

// --- 5. Inicialização do Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});