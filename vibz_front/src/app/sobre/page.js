'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import styles from './Sobre.module.css';

export default function Sobre() {
    return (
        <div className={styles.pageWrapper}>
            <Header />
            
            <main className={styles.main}>
                {/* HERO SECTION - Estilo "Vitrine Cultural" */}
                <section className={styles.hero}>
                    {/* Substitua '/img/hero-vca.jpg' pela foto do Cristo ou da cidade */}
                    <div className={styles.heroBackground} style={{ backgroundImage: "url('/img/hero-bg.jpg')" }}>
                        <div className={styles.overlay}></div>
                    </div>
                    
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>VIBZ</h1>
                        <p className={styles.heroSubtitle}>
                            Nosso objetivo é conectar pessoas a experiências únicas, 
                            tornando o entretenimento e o conhecimento acessíveis para todos.
                        </p>
                    </div>
                </section>

                {/* SEÇÃO 1: Foco no Produtor/Plataforma */}
                <section className={styles.contentSection}>
                    <div className={styles.container}>
                        <div className={styles.row}>
                            <div className={styles.imageCol}>
                                {/* Coloque uma foto de alguém usando o computador ou um evento */}
                                <img 
                                    src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=1000&auto=format&fit=crop" 
                                    alt="Gestão de Eventos" 
                                    className={styles.contentImage} 
                                />
                            </div>
                            <div className={styles.textCol}>
                                <h2>A ferramenta essencial para quem produz.</h2>
                                <p>
                                    A <strong>Vibz</strong> é a parceira ideal para produtores que desejam ampliar seu alcance em 
                                    Vitória da Conquista e região. Nossa plataforma oferece um espaço dinâmico para 
                                    divulgar shows, festivais, congressos e workshops.
                                </p>
                                <p>
                                    Além de fortalecer a cena local, ajudamos a impulsionar a economia criativa, 
                                    promovendo maior visibilidade e controle financeiro para o seu evento. 
                                    Faça parte dessa revolução.
                                </p>
                                <Link href="/admin/new" className={styles.textLink}>
                                    Começar agora <FaArrowRight />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SEÇÃO 2: Foco no Público (Invertido) */}
                <section className={`${styles.contentSection}`}>
                    <div className={styles.container}>
                        <div className={`${styles.row} ${styles.reverseRow}`}>
                            <div className={styles.imageCol}>
                                {/* Coloque uma foto de público/show */}
                                <img 
                                    src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop" 
                                    alt="Público em evento" 
                                    className={styles.contentImage} 
                                />
                            </div>
                            <div className={styles.textCol}>
                                <h2>Viva momentos inesquecíveis.</h2>
                                <p>
                                    Quer ficar por dentro de tudo o que acontece na cena de Conquista? 
                                    A Vibz é a sua agenda oficial.
                                </p>
                                <p>
                                    Nossa missão é facilitar o acesso à cultura e ao entretenimento. 
                                    Aqui você descobre, participa e garante seu ingresso de forma 100% segura e digital.
                                    Esqueça filas e burocracia. Explore, aproveite e viva a cidade com a Vibz!
                                </p>
                                <Link href="/" className={styles.textLink}>
                                    Explorar agenda <FaArrowRight />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}