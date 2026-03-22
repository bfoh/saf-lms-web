import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                // HTML pages: never cache — browser always fetches fresh after a deploy
                source: "/((?!_next/static|_next/image|favicon.ico).*)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=0, must-revalidate",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
