import { Inter } from "next/font/google";
import "./globals.css";
import "./Auth.css"; 

import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Vibz",
  description: "Plataforma de eventos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className={inter.className}>
        <GoogleOAuthProvider clientId="433598857050-jrj1482ea6ea3kvvshrr711qolunsv48.apps.googleusercontent.com">
            {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}