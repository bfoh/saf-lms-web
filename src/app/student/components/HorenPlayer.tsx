"use client";

import { useState } from "react";
import { Play, Pause, Loader2, Volume2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface Props {
    textPayload: string;
    title: string;
}

export default function HorenPlayer({ textPayload, title }: Props) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const loadAndPlayAudio = async () => {
        if (audioUrl) {
            setIsPlaying(!isPlaying);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetchApi('/ai-agents/horen/generate', {
                method: 'POST',
                body: JSON.stringify({ text: textPayload })
            }) as { audioUrl: string };
            setAudioUrl(res.audioUrl);
            setIsPlaying(true);
        } catch (error) {
            console.error("Failed to generate Hören audio:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
                <button
                    onClick={loadAndPlayAudio}
                    disabled={isLoading}
                    className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-5 h-5 text-white fill-current" />
                    ) : (
                        <Play className="w-5 h-5 text-white fill-current ml-1" />
                    )}
                </button>
                <div>
                    <h4 className="font-medium text-sm text-gray-200">{title}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Volume2 className="w-3 h-3" />
                        AI Generated Audio
                    </p>
                </div>
            </div>

            <div className="flex-1 max-w-xs mx-4">
                {/* Visualizer Mock */}
                <div className="h-4 flex items-end gap-1 overflow-hidden opacity-50 justify-center">
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 bg-brand-primary rounded-t-sm transition-all duration-150 ${(isPlaying && !isLoading) ? 'animate-pulse' : 'h-1'}`}
                            style={{ height: (isPlaying && !isLoading) ? `${Math.max(20, Math.random() * 100)}%` : '4px' }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
