'use client';

import React from 'react';
import Link from 'next/link';
import { 
    FaCcVisa, 
    FaCcMastercard, 
    FaCcAmex, 
    FaStripe, 
    FaLock, 
    FaShieldAlt, 
    FaInstagram
} from 'react-icons/fa';
// Importa o botão de instalação que criamos
import InstallAppButton from './InstallAppButton'; 
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footerWrapper}>
            <div className={styles.container}>
                
                {/* --- ÁREA SUPERIOR: LOGO, LINKS E CONFIANÇA --- */}
                <div className={styles.mainContent}>
                    
                    {/* COLUNA ESQUERDA: Navegação */}
                    <div className={styles.leftColumn}>
                        <div className={styles.brand}>
                            <img src="/img/vibe_site.png" alt="Vibz Logo" className={styles.footerLogo} />
                            
                            {/* Botão de Instalar App posicionado aqui */}
                            <div className={styles.installArea}>
                                <InstallAppButton />
                            </div>
                        </div>

                        <div className={styles.navLinks}>
                            <div className={styles.navGroup}>
                                <span className={styles.navTitle}>Vibz</span>
                                <Link href="/" className={styles.link}>Home</Link>
                                <Link href="/sobre" className={styles.link}>Sobre nós</Link>
                            </div>

                            <div className={styles.navGroup}>
                                <span className={styles.navTitle}>Para Produtores</span>
                                <Link href="/admin/new" className={styles.link}>Crie seu evento</Link>
                            </div>

                            <div className={styles.navGroup}>
                                <span className={styles.navTitle}>Políticas</span>
                                <Link href="/termos" className={styles.link}>Termos de Uso</Link>
                                <Link href="/politica" className={styles.link}>Privacidade</Link>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: Pagamento e Segurança */}
                    <div className={styles.rightColumn}>
                        
                        <div className={styles.trustBlock}>
                            <h4 className={styles.trustTitle}>Formas de Pagamento</h4>
                            <div className={styles.paymentIcons}>
                                <div className={styles.stripeBadge} title="Pagamentos processados via Stripe">
                                    <FaStripe size={24} /> 
                                </div>
                                <FaCcVisa title="Visa" />
                                <FaCcMastercard title="Mastercard" />
                                <FaCcAmex title="American Express" />
                            </div>
                        </div>

                        <div className={styles.trustBlock}>
                            <h4 className={styles.trustTitle}>Segurança</h4>
                            <div className={styles.securityBadges}>
                                <div className={styles.securityItem}>
                                    <FaLock /> SSL Seguro
                                </div>
                                <div className={styles.securityItem}>
                                    <FaShieldAlt /> Anti-Fraude
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- ÁREA INFERIOR: COPYRIGHT E SOCIAL --- */}
                <div className={styles.bottomBar}>
                    <p className={styles.copyright}>
                        Vibz Eventos © {new Date().getFullYear()} - Todos os direitos reservados.
                    </p>
                    <div className={styles.socialIcons}>
                        <a href="https://www.instagram.com/vibzeventos/" target="_blank" className={styles.socialIcon} aria-label="Instagram">
                            <FaInstagram />
                        </a>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;