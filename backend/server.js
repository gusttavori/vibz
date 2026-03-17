require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// Certifique-se de importar o controller do webhook corretamente
const { handleStripeWebhook } = require('./controllers/webhookController');

// --- Importação das Rotas ---
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const configRoutes = require('./routes/configRoutes');

const app = express();

// --- 1. Webhook do Stripe (ANTES do express.json) ---
// O Stripe precisa do corpo "raw" (cru) para validar a assinatura de segurança
app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook
);

// --- 2. Configuração de CORS (LISTA DE DOMÍNIOS SEGUROS) ---
const allowedOrigins = [
    'http://localhost:3000', // Para desenvolvimento local
    'https://vibzeventos.vercel.app', // Link antigo da Vercel
    'https://vibzeventos.com.br', // Domínio oficial (sem www)
    'https://www.vibzeventos.com.br' // Domínio oficial (com www)
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor acordado! 🚀' });
});

app.get('/', (req, res) => {
    res.send('API Vibz Funcionando 🚀');
});

app.use((req, res, next) => {
    res.status(404).json({ message: 'Rota não encontrada.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});