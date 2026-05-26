'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { FaArrowRight, FaStar, FaHeart, FaMapMarkerAlt } from 'react-icons/fa';
import styles from './Sobre.module.css';

export default function Sobre() {
    return (
        <div className={styles.pageWrapper}>
            <Header />
            
            <main className={styles.main}>
                {/* HERO SECTION - Premium */}
                <section className={styles.hero}>
                    <div className={styles.heroBackground} style={{ backgroundImage: "url('/img/hero-bg.jpg')" }}></div>
                    <div className={styles.overlay}></div>
                    
                    <div className={styles.heroContent}>
                        <span className={styles.topBadge}>Vitória da Conquista • BA</span>
                        <h1 className={styles.heroTitle}>A pulsação cultural da cidade.</h1>
                        <p className={styles.heroSubtitle}>
                            Nascemos para conectar pessoas a experiências únicas, transformando o entretenimento e a cultura em um pilar de acesso para todos.
                        </p>
                    </div>
                </section>

                {/* SEÇÃO 1: Foco na Curadoria */}
                <section className={styles.contentSection}>
                    <div className={styles.container}>
                        <div className={styles.gridSplit}>
                            <div className={styles.imageBox}>
                                <img 
                                    src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=1000&auto=format&fit=crop" 
                                    alt="Bastidores e Produção" 
                                    className={styles.sectionImg} 
                                />
                                <div className={styles.imgFloatingBadge}>
                                    <FaStar /> Curadoria Vibz
                                </div>
                            </div>
                            <div className={styles.textBox}>
                                <h2>Sua vitrine, nossa curadoria.</h2>
                                <p>
                                    Mais do que um guia, a <strong>Vibz</strong> é um selo de qualidade. Atuamos de forma estratégica para que os melhores eventos de Vitória da Conquista e região alcancem o público certo.
                                </p>
                                <p>
                                    Não somos apenas uma lista; somos o canal onde o produtor encontra visibilidade e o público encontra confiança. Selecionamos cada experiência com o rigor que a nossa cena cultural merece.
                                </p>
                                <a href="https://www.instagram.com/vibzeventos/" target="_blank" rel="noopener noreferrer" className={styles.textLink}>
                                    Falar com a equipe <FaArrowRight />
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SEÇÃO 2: Foco no Público (Fundo cinza claro) */}
                <section className={`${styles.contentSection} ${styles.bgLight}`}>
                    <div className={styles.container}>
                        <div className={`${styles.gridSplit} ${styles.reverseMobile}`}>
                            <div className={styles.textBox}>
                                <h2>Viva momentos inesquecíveis.</h2>
                                <p>
                                    Onde você vai hoje? A resposta está aqui. Nossa missão é facilitar o acesso à cultura e ao lazer, reunindo em um só lugar tudo o que está acontecendo de relevante na cidade.
                                </p>
                                <p>
                                    Com uma interface intuitiva, a Vibz permite que você explore a agenda da cidade e seja direcionado para os canais oficiais de venda de forma rápida e segura.
                                </p>
                                <div className={styles.featuresRow}>
                                    <div className={styles.featureMini}>
                                        <FaHeart className={styles.featureIcon} />
                                        <span>Feito por quem ama a cidade</span>
                                    </div>
                                    <div className={styles.featureMini}>
                                        <FaMapMarkerAlt className={styles.featureIcon} />
                                        <span>O melhor da região em um clique</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.imageBox}>
                                <img 
                                    src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop" 
                                    alt="Público em Evento" 
                                    className={styles.sectionImg} 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA FINAL - Fundo Escuro Premium */}
                <section className={styles.ctaSection}>
                    <div className={styles.ctaContent}>
                        <h2>Pronto para viver a cidade?</h2>
                        <p>Explore os eventos de hoje e descubra novas experiências.</p>
                        <Link href="/" className={styles.btnPrimaryGlow}>
                            Explorar Agenda <FaArrowRight />
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}