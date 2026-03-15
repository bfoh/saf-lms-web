import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
    title: "SAF Institute | Language School LMS",
    description: "Comprehensive language school management and learning system tailored for the SAF Institute.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${poppins.variable} font-sans antialiased text-brand-text bg-brand-bg`}>
                <AuthProvider>
                    <NotificationProvider>
                        {children}
                    </NotificationProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
