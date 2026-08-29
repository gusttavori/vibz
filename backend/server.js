require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet'); // <-- 1. Importação do Helmet
const rateLimit = require('express-rate-limit'); // <-- 2. Importação do Rate Limit

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
const financeRoutes = require('./routes/financeRoutes');

// --- Importação das Rotas do MVP (Música ao Vivo) ---
const artistRoutes = require('./routes/artistRoutes');
const placeRoutes = require('./routes/placeRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

const app = express();

// 👇 SOLUÇÃO PARA O ERRO 429 DE RATE LIMIT NO PROXY 👇
app.set('trust proxy', 1); 

// ==========================================
// 🛡️ 1. CABEÇALHOS DE SEGURANÇA (Helmet)
// ==========================================
app.use(helmet({
    // Permite que o frontend carregue as imagens armazenadas no Cloudinary e no Backend
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// --- 1. Webhook do Stripe (ANTES do express.json) ---
// O Stripe precisa do corpo "raw" (cru) para validar a assinatura de segurança.
// Colocamos antes do Rate Limiter para o Stripe NUNCA ser bloqueado.
app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook
);

// --- 2. Configuração de CORS (LISTA DE DOMÍNIOS SEGUROS) ---
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'https://vibzeventos.vercel.app',
    'https://vibzeventos.com.br',
    'https://www.vibzeventos.com.br'
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ❌ REMOVI A ROTA DUPLICADA QUE ESTAVA AQUI

// ==========================================
// 🛡️ 2. PROTEÇÃO CONTRA BOTS E FORÇA BRUTA (Rate Limiting)
// ==========================================

// Limiter Geral: Protege o banco de dados contra raspagem de dados e DDoS
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500, // Limite super generoso para usuários reais, mas barra bots
    message: { message: 'Muitas requisições recebidas deste IP. Por favor, aguarde alguns minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limiter Auth: Muito restrito, focado em impedir ataques de Força Bruta
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // Apenas 15 tentativas de login/cadastro/senha por IP
    message: { msg: 'Várias tentativas de login detectadas. Por segurança, aguarde 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.method === 'GET' && req.originalUrl.includes('/auth/me');
    }
});

// Aplica o bloqueio geral a todas as rotas abaixo desta linha
app.use('/api/', generalLimiter);

// ==========================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Aplica a blindagem rigorosa APENAS nas rotas de autenticação
app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/finance', financeRoutes); 

app.use('/api/artists', artistRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/schedules', scheduleRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor acordado! 🚀 e Blindado 🛡️' });
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