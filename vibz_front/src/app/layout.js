import { Inter } from "next/font/google";
import "./globals.css";
import "./Auth.css"; 

import { GoogleOAuthProvider } from '@react-oauth/google';
import InstallPrompt from '@/components/InstallPrompt'; // <--- 1. Importar o componente

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Vibz",
  description: "Plataforma de eventos",
  manifest: "/manifest.json", // <--- 2. Link para o manifesto PWA
  icons: {
    apple: "/icons/icon-192x192.png", // Ícone para iOS
  },
};

// <--- 3. Configuração da Viewport (Cor do tema e Escala)
export const viewport = {
  themeColor: "#4C01B5", // Cor roxa da Vibz na barra do navegador
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Sensação de app nativo (sem zoom de pinça)
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>
        <GoogleOAuthProvider clientId="433598857050-jrj1482ea6ea3kvvshrr711qolunsv48.apps.googleusercontent.com">
            {children}
            <InstallPrompt /> {/* <--- 4. Componente de Instalação aqui */}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}