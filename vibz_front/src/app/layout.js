import { Inter } from "next/font/google";
import "./globals.css";
import "./Auth.css"; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import InstallPrompt from '@/components/InstallPrompt';
import PWACleaner from '@/components/PWACleaner';
import { GoogleAnalytics } from '@next/third-parties/google';
import VLibrasWidget from '@/components/VLibrasWidget'; // Importação do VLibras

const inter = Inter({ subsets: ["latin"] });

// METADADOS PERMITIDOS AQUI (Pois o arquivo não é mais "use client")
export const metadata = {
  title: "Vibz",
  description: "Plataforma de eventos",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192x192.png",
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