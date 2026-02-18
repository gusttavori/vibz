import { Inter } from "next/font/google";
import "./globals.css";
import "./Auth.css"; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import InstallPrompt from '@/components/InstallPrompt';
import PWACleaner from '@/components/PWACleaner'; // <--- Importe o novo componente

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
        <PWACleaner /> {/* <--- Adicione o limpador aqui */}
        <GoogleOAuthProvider clientId="433598857050-jrj1482ea6ea3kvvshrr711qolunsv48.apps.googleusercontent.com">
            {children}
            <InstallPrompt />
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}