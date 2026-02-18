const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        return jwt.sign({ id }, 'secret_temporario_vibz', { expiresIn: '7d' });
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525, 
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000
});

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'Preencha todos os campos.' });

    try {
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) return res.status(400).json({ msg: 'Email já cadastrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                isAdmin: false
            }
        });

        const token = generateToken(user.id);
        res.status(201).json({ msg: 'Sucesso!', token, user: { id: user.id, _id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Erro registro:", err);
        res.status(500).json({ msg: 'Erro no servidor: ' + err.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Preencha email e senha.' });

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ msg: 'Credenciais inválidas.' });
        if (!user.password) return res.status(400).json({ msg: 'Use login com Google.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Credenciais inválidas.' });

        const token = generateToken(user.id);
        res.json({ msg: 'Login OK!', token, user: { id: user.id, _id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
    } catch (err) {
        console.error("Erro login:", err);
        res.status(500).json({ msg: 'Erro no servidor.' });
    }
};

const googleLogin = async (req, res) => {
    const { code } = req.body;

    try {
        if (!code) {
            return res.status(400).json({ msg: "Código de autorização não fornecido." });
        }

        const REDIRECT_URI = process.env.NODE_ENV === 'production' 
            ? 'https://vibzeventos.vercel.app/login' 
            : 'http://localhost:3000/login';

        const { tokens } = await googleClient.getToken({
            code: code,
            redirect_uri: REDIRECT_URI
        });

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            if (!user.name || user.name === 'Usuário Google') {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { name: name }
                });
            }
            const token = generateToken(user.id);
            return res.json({ msg: "Login Google OK!", token, user: { id: user.id, _id: user.id, name: user.name, email: user.email } });
        } else {
            const randomPassword = Math.random().toString(36).slice(-8) + (process.env.JWT_SECRET || 'vibz');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await prisma.user.create({
                data: {
                    name: name || 'Usuário Google',
                    email: email,
                    password: hashedPassword,
                    isAdmin: false
                }
            });
            const token = generateToken(user.id);
            return res.status(201).json({ msg: "Cadastro Google OK!", token, user: { id: user.id, _id: user.id, name: user.name, email: user.email } });
        }
    } catch (err) {
        console.error("Erro detalhado no Google Login:", err.response ? err.response.data : err.message);
        res.status(500).json({ msg: "Falha na autenticação Google interna." });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ msg: 'Email não encontrado.' });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.update({
            where: { email },
            data: {
                resetPasswordToken: code,
                resetPasswordExpires: new Date(Date.now() + 3600000) 
            }
        });
        const mailOptions = {
            to: user.email,
            from: `"Vibz" <vibzeventos@gmail.com>`, 
            subject: 'Redefinir Senha - Vibz',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4C01B5;">Recuperação de Senha</h2>
                    <p>Use o código abaixo para redefinir sua senha:</p>
                    <h1 style="letter-spacing: 5px; background: #f3e8ff; display: inline-block; padding: 10px 20px; border-radius: 8px;">${code}</h1>
                    <p>Válido por 1 hora.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ msg: 'Código enviado!' });
    } catch (error) {
        console.error("Erro no envio:", error); 
        res.status(500).json({ msg: 'Erro ao enviar email.' });
    }
};

const validateResetCode = async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: {
                email,
                resetPasswordToken: code,
                resetPasswordExpires: { gt: new Date() }
            }
        });
        if (!user) return res.status(400).json({ msg: 'Código inválido ou expirado.' });
        res.status(200).json({ msg: 'Código válido.' });
    } catch (error) {
        res.status(500).json({ msg: 'Erro ao validar.' });
    }
};

const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: {
                email,
                resetPasswordToken: code,
                resetPasswordExpires: { gt: new Date() }
            }
        });
        if (!user) return res.status(400).json({ msg: 'Código inválido ou expirado.' });
        if (user.password) {
            const isSame = await bcrypt.compare(newPassword, user.password);
            if (isSame) return res.status(400).json({ msg: 'Nova senha não pode ser igual à anterior.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });
        res.status(200).json({ msg: 'Senha alterada!' });
    } catch (error) {
        console.error("Erro resetPassword:", error);
        res.status(500).json({ msg: 'Erro ao redefinir senha.' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const myEvents = await prisma.event.findMany({
            where: { organizerId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ 
            user: { ...user, _id: user.id }, 
            myEvents: myEvents.map(e => ({ ...e, _id: e.id })), 
            metrics: { activeEvents: myEvents.length } 
        });
    } catch (error) {
        console.error("Erro getMe:", error);
        res.status(500).json({ message: 'Erro ao buscar perfil.' });
    }
};

module.exports = {
    registerUser, loginUser, googleLogin, forgotPassword, resetPassword, validateResetCode, getMe
};