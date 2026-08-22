import { Inter } from "next/font/google";
import "./globals.css";
import "./Auth.css"; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import InstallPrompt from '@/components/InstallPrompt';
import PWACleaner from '@/components/PWACleaner';
import { GoogleAnalytics } from '@next/third-parties/google';
import VLibrasWidget from '@/components/VLibrasWidget'; 

const inter = Inter({ subsets: ["latin"] });

// METADADOS OTIMIZADOS PARA SEO E COMPARTILHAMENTO
export const metadata = {
  title: {
    template: "%s | Vibz",
    default: "Vibz | Ingressos e Eventos em Vitória da Conquista", // Título principal focado no negócio local
  },
  description: "Descubra a melhor agenda cultural, festas e shows. Compre seus ingressos online com segurança, agilidade e sem filas na plataforma Vibz.",
  keywords: [
    "eventos em Vitória da Conquista", 
    "comprar ingressos online", 
    "festas", 
    "shows", 
    "agenda cultural", 
    "Vibz", 
    "ingressos digitais",
    "bilheteria online"
  ],
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    title: "Vibz | Ingressos e Eventos",
    description: "Sua conexão com as melhores experiências, festas e shows da cidade. Garanta seu ingresso online agora.",
    url: "https://seusite.com.br", // Troque para o domínio real quando tiver
    siteName: "Vibz",
    images: [
      {
        url: "/img/vibe_site.png", 
        width: 1200,
        height: 630,
        alt: "Vibz - Plataforma de Eventos",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibz | Ingressos e Eventos",
    description: "A melhor agenda cultural na palma da sua mão. Compre ingressos com segurança.",
    images: ["/img/vibe_site.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  themeColor: "#4C01B5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>
        <PWACleaner />
        <GoogleOAuthProvider clientId="433598857050-jrj1482ea6ea3kvvshrr711qolunsv48.apps.googleusercontent.com">
            {children}
            <InstallPrompt />
        </GoogleOAuthProvider>
        
        {/* Rastreamento do Google Analytics de forma otimizada */}
        <GoogleAnalytics gaId="G-37B5HVWY8J" />

        {/* Avatar 3D de Acessibilidade em Libras */}
        <VLibrasWidget />
      </body>
    </html>
  );
}