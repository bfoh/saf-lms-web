'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useTracks,
    useRoomContext,
    VideoTrack,
    ParticipantContext,
    useParticipants,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import fixWebmDuration from 'fix-webm-duration';
import { fetchApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Loader2,
    BookOpen,
    AlertCircle,
    Users,
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorUp,
    Circle,
    User as UserIcon,
    LogOut,
    Film,
    X,
    CheckCircle,
    MessageSquare,
    Hand,
    Send,
    BellRing,
} from 'lucide-react';

interface ChatMessage {
    userId: string;
    userName: string;
    content: string;
    ts: number;
    isLocal?: boolean;
}

interface VirtualClassroomProps {
    sessionId: string;
    participantName: string;
    isInstructor: boolean;
}

export default function VirtualClassroom({ sessionId, participantName, isInstructor }: VirtualClassroomProps) {
    const [token, setToken] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        (async () => {
            try {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!sessionId || sessionId === 'undefined' || !uuidRegex.test(sessionId)) {
                    console.warn('VirtualClassroom: sessionId is missing or invalid, skipping token fetch:', sessionId);
                    return;
                }

                const data = await fetchApi<{ token: string }>(`/live-kit/token?room=${sessionId}`);
                setToken(data.token);

                if (isInstructor) {
                    try {
                        await fetchApi(`/live-classroom/${sessionId}/start`, { method: 'POST' });
                    } catch (e) {
                        console.error('Failed to start session status:', e);
                    }
                }
            } catch (e: any) {
                console.error('Virtual Classroom Connection Error:', e);
                setError(e.message || 'Connection failed. Please check your network.');
            }
        })();
    }, [sessionId, isInstructor]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Connection Error</h2>
                <p className="text-gray-400 text-center max-w-md">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-[#00305E] rounded-lg font-semibold hover:bg-[#00407E] transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#00305E] mb-4" />
                <p className="text-lg font-medium">Connecting to SAF Virtual Classroom...</p>
                <p className="text-gray-500 text-sm mt-2">Preparing your secure session</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#001529] overflow-hidden text-white font-inter">
            <LiveKitRoom
                key={token}
                video={true}
                audio={true}
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                onDisconnected={() => {
                    window.location.href = isInstructor ? '/instructor/classes' : '/student/schedule';
                }}
                className="flex flex-1 overflow-hidden"
            >
                <ClassroomLayout
                    isInstructor={isInstructor}
                    sessionId={sessionId}
                    participantName={participantName}
                />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ClassroomLayout — inner LiveKit component, owns recording + interaction logic
// ─────────────────────────────────────────────────────────────────────────────

interface ClassroomLayoutProps {
    isInstructor: boolean;
    sessionId: string;
    participantName: string;
}

function ClassroomLayout({ isInstructor, sessionId, participantName }: ClassroomLayoutProps) {
    const room = useRoomContext();
    const router = useRouter();
    const allParticipants = useParticipants();

    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    // ── Sidebar ───────────────────────────────────────────────────────────────
    const [participantsVisible, setParticipantsVisible] = useState(true);
    const [sidebarTab, setSidebarTab] = useState<'participants' | 'chat'>('participants');
    const sidebarTabRef = useRef(sidebarTab);
    useEffect(() => { sidebarTabRef.current = sidebarTab; }, [sidebarTab]);

    // ── Control state ────────────────────────────────────────────────────────
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    useEffect(() => {
        const lp = room.localParticipant;
        setIsMuted(!lp.isMicrophoneEnabled);
        setIsVideoOff(!lp.isCameraEnabled);
        setIsScreenSharing(lp.isScreenShareEnabled);
    }, [
        room.localParticipant.isMicrophoneEnabled,
        room.localParticipant.isCameraEnabled,
        room.localParticipant.isScreenShareEnabled,
    ]);

    // ── Chat state ────────────────────────────────────────────────────────────
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [unreadChat, setUnreadChat] = useState(0);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // ── Hand-raise state ──────────────────────────────────────────────────────
    // Map of participant identity → display name for those with raised hands
    const [raisedHands, setRaisedHands] = useState<Map<string, string>>(new Map());
    const [myHandRaised, setMyHandRaised] = useState(false);
    const [calledOn, setCalledOn] = useState(false);

    // ── Data channel (chat + hand-raise) ──────────────────────────────────────
    const textEnc = useRef(new TextEncoder());
    const textDec = useRef(new TextDecoder());

    const broadcast = useCallback((msg: object) => {
        const data = textEnc.current.encode(JSON.stringify(msg));
        room.localParticipant.publishData(data, { reliable: true } as any);
    }, [room]);

    useEffect(() => {
        const handleData = (payload: Uint8Array, participant: any) => {
            try {
                const msg = JSON.parse(textDec.current.decode(payload));
                const senderId: string = participant?.identity ?? 'unknown';
                const senderName: string = participant?.name || senderId;

                switch (msg.type) {
                    case 'chat': {
                        const newMsg: ChatMessage = {
                            userId: senderId,
                            userName: senderName,
                            content: msg.content,
                            ts: msg.ts ?? Date.now(),
                        };
                        setChatMessages(prev => [...prev, newMsg]);
                        if (sidebarTabRef.current !== 'chat') {
                            setUnreadChat(u => u + 1);
                        }
                        break;
                    }
                    case 'hand_raise':
                        setRaisedHands(prev => {
                            const next = new Map(prev);
                            next.set(senderId, senderName);
                            return next;
                        });
                        break;
                    case 'hand_lower':
                        setRaisedHands(prev => {
                            const next = new Map(prev);
                            next.delete(senderId);
                            return next;
                        });
                        break;
                    case 'called_on':
                        if (msg.targetId === room.localParticipant.identity) {
                            setCalledOn(true);
                        }
                        break;
                    case 'call_dismissed':
                        if (msg.targetId === room.localParticipant.identity) {
                            setCalledOn(false);
                        }
                        break;
                }
            } catch {
                // ignore malformed messages
            }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room]);

    // Auto-scroll chat to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Clear unread badge when switching to chat tab
    useEffect(() => {
        if (sidebarTab === 'chat') setUnreadChat(0);
    }, [sidebarTab]);

    const handleSendChat = useCallback(() => {
        const content = chatInput.trim();
        if (!content) return;
        // Optimistically add own message (others see it via DataReceived)
        setChatMessages(prev => [...prev, {
            userId: room.localParticipant.identity,
            userName: participantName,
            content,
            ts: Date.now(),
            isLocal: true,
        }]);
        broadcast({ type: 'chat', content, ts: Date.now() });
        setChatInput('');
    }, [chatInput, broadcast, room, participantName]);

    const handleToggleHand = useCallback(() => {
        if (myHandRaised) {
            setMyHandRaised(false);
            broadcast({ type: 'hand_lower' });
        } else {
            setMyHandRaised(true);
            broadcast({ type: 'hand_raise' });
        }
    }, [myHandRaised, broadcast]);

    const handleCallOn = useCallback((identity: string) => {
        broadcast({ type: 'called_on', targetId: identity });
        // Remove from raised hands once called on
        setRaisedHands(prev => {
            const next = new Map(prev);
            next.delete(identity);
            return next;
        });
    }, [broadcast]);

    const handleDismiss = useCallback((identity: string) => {
        broadcast({ type: 'call_dismissed', targetId: identity });
    }, [broadcast]);

    // ── Recording state ──────────────────────────────────────────────────────
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);

    const mediaRecorderRef         = useRef<MediaRecorder | null>(null);
    const recordingAudioStreamRef  = useRef<MediaStream | null>(null);
    // Ref to the video element LiveKit already renders for the local camera.
    // We draw from this directly — no track cloning needed.
    const localCamVideoRef         = useRef<HTMLVideoElement | null>(null);
    const animFrameIdRef           = useRef<number | null>(null);
    // Hidden <video> element for screen share feed into the canvas compositor
    const screenShareVideoElRef    = useRef<HTMLVideoElement | null>(null);
    // Sync ref so the rAF loop can read the latest screen-sharing state without stale closure
    const isScreenSharingRef       = useRef(isScreenSharing);
    const chunksRef                = useRef<Blob[]>([]);
    const timerRef                 = useRef<ReturnType<typeof setInterval> | null>(null);
    const finalDurationRef         = useRef(0);
    const pendingDisconnectRef     = useRef(false);

    // Keep the sync ref up to date
    useEffect(() => {
        isScreenSharingRef.current = isScreenSharing;
    }, [isScreenSharing]);

    // When screen sharing starts / stops DURING an active recording,
    // hot-swap the srcObject of the hidden screen-share video element so the
    // canvas compositor automatically picks up the new source on the next frame.
    useEffect(() => {
        if (!isRecording || !screenShareVideoElRef.current) return;
        if (isScreenSharing) {
            const screenTrack = room.localParticipant
                .getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack;
            if (screenTrack) {
                screenShareVideoElRef.current.srcObject = new MediaStream([screenTrack]);
                void screenShareVideoElRef.current.play().catch(() => {});
            }
        } else {
            screenShareVideoElRef.current.srcObject = null;
        }
    }, [isScreenSharing, isRecording, room.localParticipant]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
            if (mediaRecorderRef.current?.state !== 'inactive') {
                mediaRecorderRef.current?.stop();
            }
            recordingAudioStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const startRecording = useCallback(async () => {
        try {
            // ── 1. Audio ──────────────────────────────────────────────────────────
            // Reuse LiveKit's published mic track — opening a second getUserMedia on
            // the same device can hang (waiting for permissions already granted to
            // LiveKit) or conflict on macOS, making the button appear non-responsive.
            const livekitMicTrack = room.localParticipant
                .getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;

            let audioTracks: MediaStreamTrack[] = [];
            if (livekitMicTrack) {
                audioTracks = [livekitMicTrack];
            } else {
                // Mic not yet published (e.g. started muted) — fall back to getUserMedia
                try {
                    const fallbackAudio = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true },
                        video: false,
                    });
                    recordingAudioStreamRef.current = fallbackAudio;
                    audioTracks = fallbackAudio.getAudioTracks();
                } catch {
                    // No audio; recording will be video-only
                }
            }

            // ── 2. Canvas compositor ──────────────────────────────────────────────
            // We render LiveKit's camera + screen-share tracks into hidden <video>
            // elements, then composite them onto a canvas each frame. This means
            // the recording automatically reflects mid-session screen-share toggles
            // without needing to restart — it's just the animation loop checking
            // isScreenSharingRef and drawing the right source each frame.

            const CANVAS_W = 1280;
            const CANVAS_H = 720;
            const PIP_W    = Math.round(CANVAS_W / 4);
            const PIP_H    = Math.round(CANVAS_H / 4);
            const PIP_PAD  = 16;

            // ── Camera: draw from LiveKit's already-rendered video element ─────────
            // Cloning the LiveKit MediaStreamTrack was unreliable: LiveKit can apply a
            // processing pipeline (background blur, resolution scaling, etc.) so the raw
            // mediaStreamTrack from getTrackPublication() may be the pre-processed input,
            // not the actual rendered output. The cloned track therefore had no drawable
            // frames, which caused the canvas to fall through to the dark fallback.
            //
            // The fix: query the <video> element LiveKit's VideoTrack component has
            // already placed in the DOM. That element is DEFINITELY decoding real frames
            // (we can see it on screen). We just point localCamVideoRef at it and draw
            // from it each frame — no extra getUserMedia, no cloning required.
            const findLocalCamVideo = (): HTMLVideoElement | null => {
                // Primary: look inside our own marker div (data-local-cam-tile).
                // We set this in ParticipantView for the local participant, so we never
                // depend on LiveKit's internal attribute names (data-lk-*).
                const container = document.querySelector('[data-local-cam-tile]');
                const inContainer = container?.querySelector('video') as HTMLVideoElement | null;
                if (inContainer) return inContainer;

                // Fallback A: LiveKit data attributes (may or may not be present)
                const byLkAttr = document.querySelector(
                    'video[data-lk-source="camera"][data-lk-local-participant="true"]',
                ) as HTMLVideoElement | null;
                if (byLkAttr) return byLkAttr;

                // Fallback B: find by matching the local camera's MediaStreamTrack ID
                const camTrackId = room.localParticipant
                    .getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack?.id;
                if (!camTrackId) return null;
                return (
                    Array.from(document.querySelectorAll('video')).find(v => {
                        const ms = v.srcObject as MediaStream | null;
                        return ms?.getVideoTracks().some(t => t.id === camTrackId);
                    }) as HTMLVideoElement
                ) ?? null;
            };
            localCamVideoRef.current = findLocalCamVideo();

            // Hidden screen-share video
            const screenEl = document.createElement('video');
            screenEl.autoplay    = true;
            screenEl.muted       = true;
            screenEl.playsInline = true;
            screenShareVideoElRef.current = screenEl;

            const screenTrack = room.localParticipant.isScreenShareEnabled
                ? room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
                      ?.track?.mediaStreamTrack
                : undefined;
            if (screenTrack) screenEl.srcObject = new MediaStream([screenTrack]);

            // Full-size, positioned off-screen — Chrome skips decoding for
            // opacity:0 or sub-pixel sized elements, producing black frames.
            screenEl.style.cssText = 'position:fixed;top:-720px;left:-1280px;width:1280px;height:720px;pointer-events:none;';
            document.body.appendChild(screenEl);
            // Only play if a source is set. Calling play() on a sourceless video element
            // returns a promise that NEVER resolves or rejects in Chrome — it hangs
            // indefinitely, blocking startRecording() from ever reaching setIsRecording(true).
            if (screenEl.srcObject) {
                await screenEl.play().catch(() => {});
            }

            // Canvas
            const canvas = document.createElement('canvas');
            canvas.width  = CANVAS_W;
            canvas.height = CANVAS_H;
            const ctx = canvas.getContext('2d')!;

            // Animation loop — runs at display refresh rate, draws whichever source
            // is currently active. Re-reads localCamVideoRef each frame so it picks up
            // any reference updates (e.g. if LiveKit re-mounts its video element).
            const drawFrame = () => {
                const sharing   = isScreenSharingRef.current;
                const camVid    = localCamVideoRef.current;
                // The LiveKit video element is ready when it has decoded frames and is playing
                const camReady    = !!(camVid && !camVid.paused && camVid.videoWidth > 0);
                const screenReady = screenEl.readyState >= 2 && screenEl.videoWidth > 0;

                if (sharing && screenReady) {
                    // Screen share fills the full canvas
                    ctx.drawImage(screenEl, 0, 0, CANVAS_W, CANVAS_H);
                    // Camera as PIP in bottom-right corner
                    if (camReady) {
                        ctx.save();
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur  = 12;
                        ctx.drawImage(
                            camVid!,
                            CANVAS_W - PIP_W - PIP_PAD,
                            CANVAS_H - PIP_H - PIP_PAD,
                            PIP_W, PIP_H,
                        );
                        ctx.restore();
                    }
                } else if (camReady) {
                    ctx.drawImage(camVid!, 0, 0, CANVAS_W, CANVAS_H);
                } else {
                    ctx.fillStyle = '#111827';
                    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                }

                animFrameIdRef.current = requestAnimationFrame(drawFrame);
            };
            drawFrame();

            // Give the video elements ~500 ms to produce actual decoded frames
            // before we start the MediaRecorder; otherwise the first chunks are black.
            await new Promise<void>(resolve => setTimeout(resolve, 500));

            // ── 3. Recording stream = canvas video + mic audio ────────────────────
            const canvasStream = canvas.captureStream(30);
            audioTracks.forEach(t => canvasStream.addTrack(t));

            // ── 4. Codec selection ────────────────────────────────────────────────
            const preferredMime = [
                'video/mp4;codecs=avc1,mp4a.40.2',
                'video/mp4',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
            ].find(t => MediaRecorder.isTypeSupported(t)) ?? '';

            const recorder = new MediaRecorder(
                canvasStream,
                preferredMime ? { mimeType: preferredMime } : undefined,
            );
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                // Stop the compositor loop and clean up
                if (animFrameIdRef.current) {
                    cancelAnimationFrame(animFrameIdRef.current);
                    animFrameIdRef.current = null;
                }
                // Remove the hidden screen-share video; camera is LiveKit's own element
                screenEl.remove();
                screenShareVideoElRef.current = null;
                localCamVideoRef.current = null;

                recordingAudioStreamRef.current?.getTracks().forEach(t => t.stop());
                recordingAudioStreamRef.current = null;

                const actualMime = recorder.mimeType || preferredMime || 'video/webm';
                const rawBlob    = new Blob(chunksRef.current, { type: actualMime });
                const durationMs = finalDurationRef.current * 1000;

                if (actualMime.includes('webm')) {
                    fixWebmDuration(rawBlob, durationMs).then(fixedBlob => {
                        setRecordingBlob(fixedBlob);
                        setShowSaveModal(true);
                    });
                } else {
                    setRecordingBlob(rawBlob);
                    setShowSaveModal(true);
                }
            };

            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingDuration(0);
            finalDurationRef.current = 0;

            timerRef.current = setInterval(() => {
                setRecordingDuration(d => {
                    finalDurationRef.current = d + 1;
                    return d + 1;
                });
            }, 1000);

        } catch (err: any) {
            console.error('[Recording] Failed to start:', err);
            if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
            recordingAudioStreamRef.current?.getTracks().forEach(t => t.stop());
            recordingAudioStreamRef.current = null;
            if (err.name === 'NotAllowedError') {
                alert('Microphone permission denied. Please allow microphone access and try again.');
            } else {
                alert(`Could not start recording: ${err.message}`);
            }
        }
    }, [room]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const handleToggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            void startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const handleExit = useCallback(() => {
        if (isRecording) {
            pendingDisconnectRef.current = true;
            stopRecording(); // onstop fires → opens save modal
        } else {
            room.disconnect();
        }
    }, [isRecording, stopRecording, room]);

    // ── Media controls ───────────────────────────────────────────────────────
    const handleToggleAudio = async () => {
        await room.localParticipant.setMicrophoneEnabled(isMuted);
    };

    const handleToggleVideo = async () => {
        await room.localParticipant.setCameraEnabled(isVideoOff);
    };

    const handleToggleScreenShare = async () => {
        try {
            if (!room?.localParticipant) {
                alert('Session not fully initialized. Please wait a moment.');
                return;
            }
            await room.localParticipant.setScreenShareEnabled(!isScreenSharing, { audio: false });
        } catch (err: any) {
            let message = 'Could not start screen sharing.';
            if (err.name === 'NotAllowedError') {
                if (navigator.userAgent.includes('Mac OS X')) {
                    message = 'Screen sharing denied. Grant the browser "Screen Recording" permission in System Settings → Privacy & Security → Screen Recording, then restart the browser.';
                } else {
                    message = 'Permission denied. Make sure your browser has permission to record the screen.';
                }
            } else if (err.name === 'NotFoundError') {
                message = 'No screen or window found to share.';
            } else if (err.name === 'NotReadableError') {
                message = 'Screen share stream unreadable — another app may be capturing the screen.';
            }
            alert(message);
        }
    };

    // ── Track separation ─────────────────────────────────────────────────────
    const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
    const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);

    const myIdentity = room.localParticipant.identity;

    return (
        <div className="flex flex-1 h-screen overflow-hidden">

            {/* ── Main video area ────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 border-r border-white/5 relative bg-[#010a12] overflow-hidden">

                {/* "Called on" banner — students only */}
                {!isInstructor && calledOn && (
                    <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 bg-amber-500/95 backdrop-blur-md px-6 py-3 border-b border-amber-400/30">
                        <BellRing className="w-4 h-4 text-white animate-bounce flex-shrink-0" />
                        <span className="text-white font-bold text-sm flex-1">You've been called on — unmute to speak!</span>
                        <button
                            onClick={() => setCalledOn(false)}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ── Header Overlay ──────────────────────────────────────────────── */}
                <div
                    className={`absolute left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none ${!isInstructor && calledOn ? 'top-12' : 'top-0'}`}
                >
                    <div className="flex items-center gap-3 pointer-events-auto">
                        {/* Live badge */}
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            <span className="text-[10px] font-bold tracking-wider uppercase opacity-90">Live Session</span>
                        </div>
                        {/* Recording badge with live timer */}
                        {isRecording && (
                            <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 px-3 py-1.5 rounded-full">
                                <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                                <span className="text-[10px] font-bold tracking-wider uppercase text-red-400">
                                    REC {formatDuration(recordingDuration)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                        <button
                            onClick={() => setParticipantsVisible(v => !v)}
                            className={`p-2 rounded-lg transition-all ${participantsVisible ? 'bg-white/10 text-[#C7F000]' : 'bg-black/40 text-white/60 hover:text-white'}`}
                            title="Toggle Sidebar"
                        >
                            <Users className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Stage ───────────────────────────────────────────────────────── */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                    {screenShareTracks.length > 0 ? (
                        // Screen Share Focus Mode
                        <div className="w-full h-full flex gap-4">
                            <div className="flex-[3] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                                {screenShareTracks[0].publication && (
                                    <VideoTrack trackRef={screenShareTracks[0] as any} className="w-full h-full object-contain" />
                                )}
                                <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#C7F000]">Sharing Screen</span>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                                {cameraTracks.map(t => (
                                    <ParticipantView
                                        key={`${t.participant.identity}_${t.source}`}
                                        trackRef={t}
                                        size="sm"
                                        hasRaisedHand={raisedHands.has(t.participant.identity)}
                                        isInstructor={isInstructor}
                                        onCallOn={() => handleCallOn(t.participant.identity)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Grid Mode
                        <div className="w-full h-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr max-w-6xl mx-auto">
                            {cameraTracks.map(t => (
                                <ParticipantView
                                    key={`${t.participant.identity}_${t.source}`}
                                    trackRef={t}
                                    hasRaisedHand={raisedHands.has(t.participant.identity)}
                                    isInstructor={isInstructor}
                                    onCallOn={() => handleCallOn(t.participant.identity)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Control Bar ─────────────────────────────────────────────────── */}
                <div className="px-6 py-6 bg-gradient-to-t from-black to-transparent flex items-center justify-center gap-4 relative z-50">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 backdrop-blur-xl p-2.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        <ControlIcon
                            Icon={isMuted ? MicOff : Mic}
                            isActive={!isMuted}
                            onClick={handleToggleAudio}
                            color={isMuted ? 'text-red-500' : 'text-white'}
                            label={isMuted ? 'Unmute' : 'Mute'}
                        />
                        <ControlIcon
                            Icon={isVideoOff ? VideoOff : Video}
                            isActive={!isVideoOff}
                            onClick={handleToggleVideo}
                            color={isVideoOff ? 'text-red-500' : 'text-white'}
                            label={isVideoOff ? 'Start Video' : 'Stop Video'}
                        />
                        <div className="w-[1px] h-6 bg-white/10 mx-1" />
                        <ControlIcon
                            Icon={MonitorUp}
                            isActive={isScreenSharing}
                            onClick={handleToggleScreenShare}
                            color={isScreenSharing ? 'text-[#C7F000]' : 'text-white'}
                            label="Share"
                        />
                        {/* Hand raise button — students only */}
                        {!isInstructor && (
                            <>
                                <div className="w-[1px] h-6 bg-white/10 mx-1" />
                                <ControlIcon
                                    Icon={Hand}
                                    isActive={myHandRaised}
                                    onClick={handleToggleHand}
                                    color={myHandRaised ? 'text-amber-400' : 'text-white'}
                                    label={myHandRaised ? 'Lower' : 'Raise'}
                                    animate={myHandRaised}
                                />
                            </>
                        )}
                        {isInstructor && (
                            <>
                                <div className="w-[1px] h-6 bg-white/10 mx-1" />
                                <ControlIcon
                                    Icon={Circle}
                                    isActive={isRecording}
                                    onClick={handleToggleRecording}
                                    color={isRecording ? 'text-red-500' : 'text-white/50'}
                                    label={isRecording ? formatDuration(recordingDuration) : 'REC'}
                                    animate={isRecording}
                                />
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleExit}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600/90 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 shadow-[0_4px_16px_rgba(220,38,38,0.4)]"
                    >
                        <LogOut className="w-4 h-4" />
                        {isRecording ? 'Stop & Exit' : 'Exit'}
                    </button>
                </div>

                {/* ── Save Recording Modal ─────────────────────────────────────────── */}
                {showSaveModal && recordingBlob && (
                    <SaveRecordingModal
                        blob={recordingBlob}
                        duration={finalDurationRef.current}
                        sessionId={sessionId}
                        pendingDisconnect={pendingDisconnectRef.current}
                        onSaved={() => {
                            if (pendingDisconnectRef.current) {
                                room.disconnect();
                            } else {
                                router.push('/instructor/resources');
                            }
                        }}
                        onDiscard={() => {
                            setShowSaveModal(false);
                            setRecordingBlob(null);
                            if (pendingDisconnectRef.current) {
                                room.disconnect();
                            }
                        }}
                    />
                )}
            </div>

            {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
            <div className={`transition-all duration-300 flex flex-col bg-white overflow-hidden flex-shrink-0 ${participantsVisible ? 'w-[320px]' : 'w-0 opacity-0'}`}>
                <header className="bg-[#00305E] px-5 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <BookOpen className="w-5 h-5 text-[#C7F000]" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-widest">
                            Classroom Console
                        </h2>
                    </div>
                    <button
                        onClick={() => setParticipantsVisible(false)}
                        className="text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {/* Tab bar */}
                <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <button
                        onClick={() => setSidebarTab('participants')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${sidebarTab === 'participants' ? 'text-[#00305E] border-b-2 border-[#00305E] bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Participants
                        {raisedHands.size > 0 && (
                            <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                                {raisedHands.size}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setSidebarTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${sidebarTab === 'chat' ? 'text-[#00305E] border-b-2 border-[#00305E] bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                        {unreadChat > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                                {unreadChat}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {sidebarTab === 'participants' ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {/* Raised hands section — instructor sees action buttons */}
                                {raisedHands.size > 0 && (
                                    <div className="mb-2">
                                        <h3 className="text-[10px] font-bold text-amber-600 uppercase mb-2 tracking-wider flex items-center gap-1.5">
                                            <Hand className="w-3 h-3" />
                                            Raised Hands ({raisedHands.size})
                                        </h3>
                                        {Array.from(raisedHands.entries()).map(([identity, name]) => (
                                            <div key={identity} className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-2">
                                                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-black text-[10px] font-bold uppercase flex-shrink-0">
                                                    {name.substring(0, 2)}
                                                </div>
                                                <span className="flex-1 text-xs font-semibold text-gray-800 truncate">{name}</span>
                                                {isInstructor && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCallOn(identity)}
                                                            className="text-[10px] font-bold px-2 py-1 bg-[#0F6B3E] text-white rounded-lg hover:bg-[#0d5c34] transition-colors flex-shrink-0"
                                                        >
                                                            Call On
                                                        </button>
                                                        <button
                                                            onClick={() => handleDismiss(identity)}
                                                            className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        <div className="border-t border-gray-100 my-3" />
                                    </div>
                                )}

                                <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">
                                    Connected ({allParticipants.length})
                                </h3>
                                {allParticipants.map(p => {
                                    const isLocal = p.identity === myIdentity;
                                    const hasHand = raisedHands.has(p.identity);
                                    return (
                                        <div key={p.identity} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="w-8 h-8 rounded-full bg-[#00305E] flex items-center justify-center text-white text-[10px] font-bold uppercase flex-shrink-0">
                                                {(p.name || p.identity).substring(0, 2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {p.name || p.identity}{isLocal ? ' (You)' : ''}
                                                </p>
                                                <p className="text-[10px] text-gray-400 capitalize">
                                                    {isLocal ? (isInstructor ? 'Instructor' : 'Student') : 'Student'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {hasHand && <Hand className="w-3.5 h-3.5 text-amber-400" />}
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-100 italic text-[10px] text-gray-400 leading-snug flex-shrink-0">
                                Secure connection via SAF Institute Node-6. End-to-end encrypted session.
                            </div>
                        </>
                    ) : (
                        /* ── Chat tab ─────────────────────────────────────────────── */
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                                {chatMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                        <MessageSquare className="w-8 h-8 text-gray-300 mb-3" />
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            No messages yet.<br />Say something to the class!
                                        </p>
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => {
                                    const isMe = msg.isLocal || msg.userId === myIdentity;
                                    return (
                                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && (
                                                <span className="text-[9px] text-gray-400 font-bold mb-1 ml-1 uppercase tracking-wider">
                                                    {msg.userName}
                                                </span>
                                            )}
                                            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                                                isMe
                                                    ? 'bg-[#00305E] text-white rounded-tr-sm'
                                                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>
                            {/* Chat input */}
                            <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendChat();
                                            }
                                        }}
                                        placeholder="Type a message…"
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#00305E]/20 focus:border-[#00305E] transition"
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        disabled={!chatInput.trim()}
                                        className="p-2 rounded-xl bg-[#00305E] text-white hover:bg-[#00407E] disabled:opacity-40 transition-all flex-shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaveRecordingModal
// ─────────────────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface SaveRecordingModalProps {
    blob: Blob;
    duration: number;
    sessionId: string;
    pendingDisconnect: boolean;
    onSaved: () => void;
    onDiscard: () => void;
}

function SaveRecordingModal({ blob, duration, sessionId, onSaved, onDiscard }: SaveRecordingModalProps) {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const [title, setTitle] = useState(`Live Session Recording — ${today}`);
    const [cefrLevel, setCefrLevel] = useState('B1');
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');

    // Create an object URL for in-modal preview and clean it up on unmount
    useEffect(() => {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [blob]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSave = async () => {
        setStatus('uploading');
        setErrorMsg('');

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Upload blob to Supabase Storage
            const timestamp = Date.now();
            // Derive extension from the actual blob type so Safari mp4 recordings
            // get a .mp4 filename and the correct Content-Type header on Supabase.
            const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
            const contentType = blob.type || `video/${ext}`;
            const fileName = `${sessionId}-${timestamp}.${ext}`;
            const storagePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('lecture-recordings')
                .upload(storagePath, blob, { contentType });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('lecture-recordings')
                .getPublicUrl(storagePath);

            // 2. Insert resource record
            const { data: resource, error: resourceError } = await supabase
                .from('resources')
                .insert({
                    title: title.trim() || `Recording — ${today}`,
                    type: 'Recording',
                    file_url: publicUrl,
                    file_name: fileName,
                    file_size: blob.size,
                    file_type: contentType,
                    cefr_level: cefrLevel,
                    uploaded_by: user.id,
                    shared: false,
                })
                .select()
                .single();

            if (resourceError) throw resourceError;

            // 3. Notify the backend
            await fetchApi(`/live-classroom/${sessionId}/save-recording`, {
                method: 'POST',
                body: JSON.stringify({ recordingUrl: publicUrl, resourceId: resource.id }),
            });

            setStatus('success');
            setTimeout(onSaved, 1800);
        } catch (err: any) {
            console.error('Failed to save recording:', err);
            setErrorMsg(err.message || 'Upload failed. Please try again.');
            setStatus('error');
        }
    };

    return (
        // Backdrop
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {/* Card */}
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#00305E] to-[#0F6B3E] px-7 py-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Film className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg leading-tight">Save Class Recording</h2>
                        <p className="text-white/60 text-xs mt-0.5">
                            {formatDuration(duration)} &nbsp;·&nbsp; {formatSize(blob.size)}
                        </p>
                    </div>
                </div>

                {status === 'success' ? (
                    // ── Success state ──
                    <div className="px-7 py-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                            <CheckCircle className="w-9 h-9 text-green-500" />
                        </div>
                        <h3 className="text-gray-800 font-bold text-lg mb-1">Recording Saved!</h3>
                        <p className="text-gray-500 text-sm">Redirecting to your Resources library...</p>
                    </div>
                ) : (
                    // ── Form state ──
                    <div className="px-7 py-6 space-y-5">
                        {/* Inline preview — lets instructor verify the file plays before uploading */}
                        {previewUrl && (
                            <video
                                src={previewUrl}
                                controls
                                className="w-full rounded-2xl bg-black max-h-40 object-contain"
                            />
                        )}
                        {/* Title */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Recording Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                disabled={status === 'uploading'}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0F6B3E]/40 focus:border-[#0F6B3E] disabled:opacity-60 transition"
                                placeholder="Enter a title for this recording"
                            />
                        </div>

                        {/* CEFR Level */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                CEFR Level
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {CEFR_LEVELS.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setCefrLevel(level)}
                                        disabled={status === 'uploading'}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all disabled:opacity-60 ${
                                            cefrLevel === level
                                                ? 'bg-[#0F6B3E] border-[#0F6B3E] text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-[#0F6B3E]/40 hover:text-[#0F6B3E]'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {status === 'error' && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 leading-relaxed">{errorMsg}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onDiscard}
                                disabled={status === 'uploading'}
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={status === 'uploading' || !title.trim()}
                                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0F6B3E] hover:bg-[#0d5c34] text-white font-bold text-sm disabled:opacity-50 transition-all shadow-md shadow-green-900/20"
                            >
                                {status === 'uploading' ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Film className="w-4 h-4" />
                                        Save to Resources
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Discard hint */}
                        {status !== 'uploading' && (
                            <p className="text-center text-[10px] text-gray-400">
                                Discarding will permanently delete the recording.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ParticipantView({
    trackRef,
    size = 'lg',
    hasRaisedHand = false,
    isInstructor = false,
    onCallOn,
}: {
    trackRef: any;
    size?: 'sm' | 'lg';
    hasRaisedHand?: boolean;
    isInstructor?: boolean;
    onCallOn?: () => void;
}) {
    let role = trackRef.participant.isLocal ? 'instructor' : 'student';
    try {
        if (trackRef.participant.metadata) {
            const metadata = JSON.parse(trackRef.participant.metadata);
            if (metadata.role) role = metadata.role;
        }
    } catch (e) {
        // ignore parse errors
    }

    return (
        // data-local-cam-tile is our own marker so startRecording() can find
        // the <video> that LiveKit is already decoding for the local camera.
        <div
            {...(trackRef.participant.isLocal ? { 'data-local-cam-tile': '' } : {})}
            className={`relative bg-black group rounded-3xl overflow-hidden border border-white/10 shadow-lg ${size === 'sm' ? 'aspect-video w-full' : 'w-full h-full'}`}
        >
            <ParticipantContext.Provider value={trackRef.participant}>
                {trackRef.publication ? (
                    <VideoTrack
                        trackRef={trackRef}
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <UserIcon className="w-12 h-12 text-white/10" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-[#C7F000] font-black opacity-80 mb-0.5">
                                {role}
                            </span>
                            <span className="text-sm font-bold text-white tracking-tight leading-none">
                                {trackRef.participant.name || trackRef.participant.identity}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {trackRef.participant.isMicrophoneEnabled ? (
                                <Mic className="w-3.5 h-3.5 text-white/40" />
                            ) : (
                                <MicOff className="w-3.5 h-3.5 text-red-500" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Raised hand badge — shown on the video tile */}
                {hasRaisedHand && !trackRef.participant.isLocal && (
                    <div className="absolute top-3 right-3 z-10">
                        {isInstructor ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCallOn?.(); }}
                                className="flex items-center gap-1 bg-amber-400 text-black text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg hover:bg-amber-300 transition-colors"
                            >
                                <Hand className="w-3 h-3" />
                                Call On
                            </button>
                        ) : (
                            <div className="bg-amber-400/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                                <Hand className="w-3 h-3" />
                                ✋
                            </div>
                        )}
                    </div>
                )}

                {!trackRef.participant.isLocal && trackRef.participant.connectionQuality === 'poor' && (
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[8px] font-bold uppercase text-amber-400 border border-amber-500/20">
                        Lagging
                    </div>
                )}
            </ParticipantContext.Provider>
        </div>
    );
}

function ControlIcon({
    Icon,
    isActive,
    onClick,
    color,
    label,
    animate = false,
}: {
    Icon: any;
    isActive: boolean;
    onClick: () => void;
    color: string;
    label: string;
    animate?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all hover:bg-white/5 active:scale-95 group relative"
        >
            <Icon
                className={`w-5 h-5 ${color} ${animate ? 'animate-pulse' : ''} transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : 'opacity-60'}`}
            />
            <span className={`text-[9px] font-black uppercase tracking-tighter transition-all ${isActive ? 'text-white' : 'text-white/30'}`}>
                {label}
            </span>
            {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#C7F000] rounded-full shadow-[0_0_4px_#C7F000]" />
            )}
        </button>
    );
}
