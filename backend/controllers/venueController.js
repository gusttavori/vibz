const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

const importInstagramFeed = async (req, res) => {
    try {
        const { venueName, city, postUrl } = req.body;

        if (!venueName || !city || !postUrl) {
            return res.status(400).json({ message: 'Preencha o nome, a cidade e o link do Instagram.' });
        }

        let imageUrl = '';
        let caption = '';

        try {
            // O token da Meta é obrigatório na API v15+. 
            // Coloque sua chave no .env como INSTAGRAM_ACCESS_TOKEN ou use "APP_ID|APP_SECRET"
            const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN; 
            
            const oEmbedApiUrl = `https://graph.facebook.com/v15.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${accessToken}&omitscript=true`;
            const response = await axios.get(oEmbedApiUrl);

            if (response.data) {
                imageUrl = response.data.thumbnail_url || '';
                caption = response.data.title || '';
            }
        } catch (apiError) {
            console.error("Erro no oEmbed:", apiError.response?.data || apiError.message);
            return res.status(400).json({ 
                message: 'Erro ao conectar com o Instagram. Verifique se o link é público e se o token da API está configurado no .env.' 
            });
        }

        if (!imageUrl) {
            return res.status(400).json({ message: 'Não foi possível extrair a imagem deste link.' });
        }

        const newFeed = await prisma.venueFeed.create({
            data: { venueName, city, imageUrl, caption, postUrl, isActive: true }
        });

        res.status(201).json({ success: true, message: 'Programação importada com sucesso!', feed: newFeed });

    } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).json({ message: 'Erro ao salvar a programação.' });
    }
};

const getActiveFeeds = async (req, res) => {
    try {
        const { city } = req.query;
        const feeds = await prisma.venueFeed.findMany({
            where: {
                isActive: true,
                city: city ? { equals: city, mode: 'insensitive' } : undefined
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(feeds);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar feeds.' });
    }
};

const deleteFeed = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.venueFeed.delete({ where: { id } });
        res.json({ success: true, message: 'Removido com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover.' });
    }
};

module.exports = { importInstagramFeed, getActiveFeeds, deleteFeed };