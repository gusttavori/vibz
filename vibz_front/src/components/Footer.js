'use client';

import React from 'react';
import Link from 'next/link';
import { FaInstagram } from 'react-icons/fa';
import InstallAppButton from './InstallAppButton'; 
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footerWrapper}>
            <div className={styles.container}>
                
                {/* --- ÁREA PRINCIPAL: LOGO E LINKS --- */}
                <div className={styles.mainContent}>
                    
                    {/* COLUNA ESQUERDA: Marca e App */}
                    <div className={styles.brandColumn}>
                        <div className={styles.brand}>
                            <img src="/img/vibe_site.png" alt="Vibz Logo" className={styles.footerLogo} />
                            <p className={styles.brandDescription}>
                                A principal agenda cultural de Vitória da Conquista e região. Descubra as melhores experiências.
                            </p>
                            <div className={styles.installArea}>
                                <InstallAppButton />
                            </div>
                        </div>
                    </div>

{/* COLUNA DIREITA: Navegação */}
                    <div className={styles.navColumn}>
                        <div className={styles.navGroup}>
                            <span className={styles.navTitle}>Vibz</span>
                            <Link href="/" className={styles.link}>Home</Link>
                            <Link href="/sobre" className={styles.link}>Sobre nós</Link>
                        </div>

                        {/* CORREÇÃO: Removido o link interno /admin/new */}
                        <div className={styles.navGroup}>
                            <span className={styles.navTitle}>Para Produtores</span>
                            <a href="https://www.instagram.com/vibzeventos/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                                Anuncie seu Evento
                            </a>
                        </div>

                        <div className={styles.navGroup}>
                            <span className={styles.navTitle}>Políticas</span>
                            <Link href="/termos" className={styles.link}>Termos de Uso</Link>
                            <Link href="/politica" className={styles.link}>Privacidade</Link>
                        </div>
                    </div>
                    
                </div>

                {/* --- ÁREA INFERIOR: COPYRIGHT E SOCIAL --- */}
                <div className={styles.bottomBar}>
                    <p className={styles.copyright}>
                        Vibz Eventos © {new Date().getFullYear()} - Todos os direitos reservados.
                    </p>
                    <div className={styles.socialIcons}>
                        <a href="https://www.instagram.com/vibzeventos/" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Instagram">
                            <FaInstagram />
                        </a>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;