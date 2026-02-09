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

// --- 2. Configuração de CORS (Segurança) ---
// Define quem pode acessar sua API
const allowedOrigins = [
    'http://localhost:3000',              // Seu teste local
    process.env.CLIENT_URL,               // Sua URL da Vercel (definida no .env do Render)
    'https://vibz.vercel.app',            // Exemplo fixo (opcional)
    'https://vibz-ingressos.vercel.app'   // Exemplo fixo (opcional)
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem 'origin' (como apps mobile ou Postman/Insomnia)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'A política de CORS deste site não permite acesso desta origem.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
    res.send('API Vibz Funcionando 🚀 (PostgreSQL)');
});

// --- 5. Inicialização do Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});