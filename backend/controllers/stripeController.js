const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createOnboardingLink = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        let accountId = user.stripeAccountId;

        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'BR',
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            accountId = account.id;
            
            await prisma.user.update({
                where: { id: userId },
                data: { stripeAccountId: accountId }
            });
        }

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.CLIENT_URL}/dashboard`, 
            return_url: `${process.env.CLIENT_URL}/dashboard?stripe=success`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });

    } catch (error) {
        console.error('Erro Stripe Onboarding:', error);
        res.status(500).json({ message: 'Erro ao conectar com Stripe.' });
    }
};

const checkStripeStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.stripeAccountId) {
            return res.status(400).json({ isComplete: false });
        }

        if (user.stripeOnboardingComplete) {
            return res.json({ isComplete: true });
        }

        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        if (account.details_submitted) {
            await prisma.user.update({
                where: { id: userId },
                data: { stripeOnboardingComplete: true }
            });
            return res.json({ isComplete: true });
        } else {
            return res.json({ isComplete: false });
        }

    } catch (error) {
        console.error('Erro Status Stripe:', error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

const createLoginLink = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.stripeAccountId) {
            return res.status(400).json({ message: 'Conta Stripe não encontrada.' });
        }

        const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
        res.json({ url: loginLink.url });

    } catch (error) {
        console.error('Erro ao gerar Login Link:', error);
        res.status(500).json({ message: 'Erro ao acessar painel Stripe.' });
    }
};

module.exports = { 
    createOnboardingLink, 
    checkStripeStatus, 
    createLoginLink 
};