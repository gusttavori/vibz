import React from 'react';
import { FaWallet, FaTicketAlt, FaHeart, FaCalendarCheck } from 'react-icons/fa';
import './DashboardStats.css'; 

const DashboardStats = ({ metrics }) => {
    const {
        totalRevenue = 0,
        ticketsSold = 0,
        favoritesCount = 0,
        activeEvents = 0
    } = metrics || {};

    const formatCurrency = (value) => {
        // Se o valor vier em centavos, divida por 100. Se vier em reais, use direto.
        // No controller ajustei para enviar * 100, então aqui dividimos.
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value / 100);
    };

    const stats = [
        {
            title: "Receita Total",
            value: formatCurrency(totalRevenue),
            icon: <FaWallet />,
            colorClass: "green-card"
        },
        {
            title: "Ingressos Vendidos",
            value: ticketsSold,
            icon: <FaTicketAlt />,
            colorClass: "blue-card"
        },
        {
            title: "Interessados (Favoritos)",
            value: favoritesCount,
            icon: <FaHeart />,
            colorClass: "purple-card"
        },
        {
            title: "Eventos Ativos",
            value: activeEvents,
            icon: <FaCalendarCheck />,
            colorClass: "orange-card"
        }
    ];

    return (
        <div className="stats-grid">
            {stats.map((stat, index) => (
                <div key={index} className={`stat-card ${stat.colorClass}`}>
                    <div className="stat-icon-wrapper">
                        {stat.icon}
                    </div>
                    <div className="stat-content">
                        <h3>{stat.value}</h3>
                        <p>{stat.title}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardStats;