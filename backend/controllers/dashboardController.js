const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(400).json({ message: "Usuário não autenticado." });
        }

        // --- LÓGICA DE BUSCA DE EVENTOS ---
        let myEvents = [];
        try {
            myEvents = await prisma.event.findMany({
                where: { organizerId: userId },
                select: { id: true }
            });
        } catch (e) {
            try {
                myEvents = await prisma.event.findMany({
                    where: { organizer: userId },
                    select: { id: true }
                });
            } catch (e2) {
                console.error("Falha ao buscar eventos:", e2.message);
            }
        }

        const myEventIds = myEvents.map(e => e.id);

        if (myEventIds.length === 0) {
            return res.json({
                revenue: 0,
                ticketsSold: 0,
                checkins: 0,
                occupancyRate: 0,
                recentSales: [],
                chartData: [
                    { name: 'Dom', vendas: 0 }, { name: 'Seg', vendas: 0 }, 
                    { name: 'Ter', vendas: 0 }, { name: 'Qua', vendas: 0 }, 
                    { name: 'Qui', vendas: 0 }, { name: 'Sex', vendas: 0 }, { name: 'Sáb', vendas: 0 }
                ]
            });
        }

        const whereTickets = {
            eventId: { in: myEventIds },
            status: { in: ['valid', 'used'] }
        };

        const [revenueAgg, ticketsSold, checkins, recentSales, salesLast7Days] = await Promise.all([
            prisma.ticket.aggregate({ _sum: { price: true }, where: whereTickets }),
            prisma.ticket.count({ where: whereTickets }),
            prisma.ticket.count({ where: { eventId: { in: myEventIds }, status: 'used' } }),
            prisma.ticket.findMany({
                where: whereTickets,
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    event: { select: { title: true } },
                    ticketType: { select: { name: true } }
                }
            }),
            (() => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                return prisma.ticket.findMany({
                    where: { ...whereTickets, createdAt: { gte: sevenDaysAgo } },
                    select: { createdAt: true, price: true }
                });
            })()
        ]);

        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const chartDataMap = new Map();

        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dayName = daysOfWeek[d.getDay()];
            const dateKey = d.toISOString().split('T')[0];
            chartDataMap.set(dateKey, { name: dayName, vendas: 0 });
        }

        salesLast7Days.forEach(ticket => {
            if (ticket.createdAt) {
                const dateKey = new Date(ticket.createdAt).toISOString().split('T')[0];
                if (chartDataMap.has(dateKey)) {
                    chartDataMap.get(dateKey).vendas += ticket.price;
                }
            }
        });

        res.json({
            revenue: revenueAgg._sum.price || 0,
            ticketsSold,
            checkins,
            occupancyRate: ticketsSold > 0 ? Math.round((checkins / ticketsSold) * 100) : 0,
            recentSales,
            chartData: Array.from(chartDataMap.values())
        });

    } catch (error) {
        console.error("ERRO DASHBOARD STATS:", error);
        res.status(500).json({ message: 'Erro interno ao carregar estatísticas.' });
    }
};

const getAllSales = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(400).json({ message: "Usuário não identificado." });

        let myEvents = [];
        try {
            myEvents = await prisma.event.findMany({ where: { organizerId: userId }, select: { id: true } });
        } catch (e) {
            myEvents = await prisma.event.findMany({ where: { organizer: userId }, select: { id: true } });
        }

        const myEventIds = myEvents.map(e => e.id);
        if (myEventIds.length === 0) return res.json([]);

        const allSales = await prisma.ticket.findMany({
            where: {
                eventId: { in: myEventIds },
                status: { in: ['valid', 'used'] }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                event: { select: { title: true } },
                ticketType: { select: { name: true } }
            }
        });

        res.json(allSales);
    } catch (error) {
        console.error("ERRO GET ALL SALES:", error);
        res.status(500).json({ message: 'Erro ao carregar histórico.' });
    }
};

// --- CORREÇÃO DA LISTA DE EVENTOS DO ORGANIZADOR ---
const getOrganizerEvents = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(400).json({ message: "Usuário não identificado." });

        let events = [];
        
        // Busca eventos
        try {
            events = await prisma.event.findMany({
                where: { organizerId: userId },
                orderBy: { createdAt: 'desc' }
            });
        } catch (e) {
            console.log("Fallback busca eventos (sem ordem)...");
            events = await prisma.event.findMany({
                where: { organizerId: userId }
            });
        }

        // Formata os dados para o Frontend (Corrigindo Data e Status)
        const formattedEvents = events.map(event => {
            // 1. Lógica para definir a data correta
            let displayDate = event.eventDate;
            
            // Se eventDate for nulo, tenta pegar da primeira sessão
            if (!displayDate && event.sessions) {
                try {
                    const sessions = typeof event.sessions === 'string' ? JSON.parse(event.sessions) : event.sessions;
                    if (Array.isArray(sessions) && sessions.length > 0 && sessions[0].date) {
                        displayDate = sessions[0].date;
                    }
                } catch(err) {}
            }

            // Se ainda for nulo, usa a data de criação
            if (!displayDate) {
                displayDate = event.createdAt;
            }

            return {
                id: event.id,
                title: event.title,
                imageUrl: event.imageUrl,
                city: event.city,
                status: event.status, // O Frontend já está tratando a tradução
                date: displayDate // <--- Agora garantimos que 'date' sempre tem valor
            };
        });

        res.json(formattedEvents);
    } catch (error) {
        console.error("ERRO GET EVENTS:", error);
        res.status(500).json({ message: "Erro ao buscar eventos." });
    }
};

module.exports = { getDashboardStats, getAllSales, getOrganizerEvents };