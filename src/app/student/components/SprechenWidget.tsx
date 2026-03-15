"use client";

import { useState } from "react";
import { Mic, Square, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface Props {
    cefrLevel: string;
    contextPrompt: string;
}

export default function SprechenWidget({ cefrLevel, contextPrompt }: Props) {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
    const [transcript, setTranscript] = useState<string[]>([]);
    const [errorMsg, setErrorMsg] = useState("");

    const startSession = async () => {
        setStatus('connecting');
        setErrorMsg("");

        try {
            // Retrieve the ephemeral Realtime token and WebRTC endpoint from backend
            const session = await fetchApi('/ai-agents/sprechen/initiate', {
                method: 'POST',
                body: JSON.stringify({ cefrLevel, context: contextPrompt })
            });

            // Mocking the WebRTC connection delay
            setTimeout(() => {
                setStatus('listening');
                setTranscript(prev => [...prev, "🎤 (Recording started...)"]);
            }, 1000);

        } catch (err) {
            setStatus('error');
            setErrorMsg("Failed to connect to the AI Examiner.");
        }
    };

    const stopSession = () => {
        setStatus('idle');
        setTranscript(prev => [...prev, "🛑 Session ended."]);
    };

    return (
        <div className="bg-white border text-center border-brand-primary/20 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary to-brand-secondary"></div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-bold text-gray-900">Goethe AI Examiner</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">{cefrLevel} Sprechen</span>
            </div>

            <div className="mb-6 mx-auto w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-300
                ${status === 'listening' ? 'border-red-400 bg-red-50 animate-pulse' : 
                  status === 'speaking' ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-200 bg-gray-50'}">
                {status === 'connecting' ? (
                    <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                ) : status === 'listening' ? (
                    <Mic className="w-12 h-12 text-red-500 animate-bounce" />
                ) : (
                    <Mic className="w-12 h-12 text-gray-400" />
                )}
            </div>

            {status === 'error' && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errorMsg}
                </div>
            )}

            <div className="flex justify-center gap-4">
                {status === 'idle' || status === 'error' ? (
                    <button
                        onClick={startSession}
                        className="bg-brand-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-brand-primary/90 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Mic className="w-4 h-4" />
                        Start Roleplay
                    </button>
                ) : (
                    <button
                        onClick={stopSession}
                        className="bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-full font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                        <Square className="w-4 h-4 fill-current" />
                        End Session
                    </button>
                )}
            </div>

            {transcript.length > 0 && (
                <div className="mt-8 text-left bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto text-sm font-mono text-gray-600">
                    {transcript.map((line, i) => (
                        <div key={i} className="mb-1">{line}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
