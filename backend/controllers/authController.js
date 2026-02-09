const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        // Fallback temporário para evitar crash se esquecer o .env
        return jwt.sign({ id }, 'secret_temporario_vibz', { expiresIn: '7d' });
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS
    }
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
    const { googleAccessToken } = req.body;
    
    // Se não vier token, tentamos pegar dados diretos (caso seu front mande o objeto user direto)
    const { email: directEmail, name: directName, googleId: directGoogleId } = req.body;

    try {
        let emailToUse = directEmail;
        let nameToUse = directName;
        let googleIdToUse = directGoogleId;

        // Se veio Access Token, buscamos no Google
        if (googleAccessToken) {
            try {
                const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { "Authorization": `Bearer ${googleAccessToken}` }
                });
                emailToUse = response.data.email;
                nameToUse = response.data.name;
                googleIdToUse = response.data.sub;
            } catch (axiosError) {
                console.error("Erro Axios Google:", axiosError.response?.data || axiosError.message);
                return res.status(400).json({ msg: "Token Google inválido." });
            }
        }

        if (!emailToUse) {
            return res.status(400).json({ msg: "Não foi possível obter o email do Google." });
        }

        // Verifica se usuário existe
        let user = await prisma.user.findUnique({ where: { email: emailToUse } });

        if (user) {
            // Usuário existe -> Login
            // REMOVIDO: user.update({ googleId }) para evitar erro de schema
            const token = generateToken(user.id);
            return res.json({ msg: "Login Google OK!", token, user: { id: user.id, _id: user.id, name: user.name, email: user.email } });
        } else {
            // Usuário novo -> Criação
            const randomPassword = Math.random().toString(36).slice(-8) + process.env.JWT_SECRET;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await prisma.user.create({
                data: {
                    name: nameToUse || 'Usuário Google',
                    email: emailToUse,
                    password: hashedPassword,
                    // googleId: googleIdToUse, // REMOVIDO: Comentado para não quebrar se a coluna não existir
                    isAdmin: false
                }
            });
            const token = generateToken(user.id);
            return res.status(201).json({ msg: "Cadastro Google OK!", token, user: { id: user.id, _id: user.id, name: user.name, email: user.email } });
        }
    } catch (err) {
        console.error("Erro Geral Google Login:", err); // Agora vai aparecer o erro real no terminal se der pau
        res.status(500).json({ msg: "Falha na autenticação Google." });
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
            from: 'Vibz <no-reply@vibz.com>',
            subject: 'Recuperação de Senha',
            text: `Seu código: ${code}`
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ msg: 'Código enviado!' });
    } catch (error) {
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
        if (!user) return res.status(400).json({ msg: 'Código inválido/expirado.' });
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
        if (!user) return res.status(400).json({ msg: 'Código inválido.' });

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) return res.status(400).json({ msg: 'Nova senha não pode ser igual à anterior.' });

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
        res.status(500).json({ msg: 'Erro ao redefinir.' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const myEvents = await prisma.event.findMany({
            where: { organizerId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        const metrics = {
            activeEvents: myEvents.length,
            favoritesCount: 0, 
            totalRevenue: 0, 
            ticketsSold: 0   
        };

        const userResponse = {
            ...user,
            _id: user.id 
        };

        const eventsResponse = myEvents.map(e => ({ ...e, _id: e.id }));

        res.json({ 
            user: userResponse, 
            myEvents: eventsResponse, 
            favoritedEvents: [],
            metrics 
        });
    } catch (error) {
        console.error("Erro getMe:", error);
        res.status(500).json({ message: 'Erro ao buscar perfil.' });
    }
};

module.exports = {
    registerUser, loginUser, googleLogin, forgotPassword, resetPassword, validateResetCode, getMe
};