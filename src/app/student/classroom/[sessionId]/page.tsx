'use client';

import * as React from 'react';
import VirtualClassroom from '@/components/live-classroom/VirtualClassroom';
import { useAuth } from '@/context/AuthContext';

export default function Page({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = React.use(params);
    const { user } = useAuth();

    const userName = (user?.user_metadata?.full_name as string) || user?.email || 'Student';

    return (
        <div style={{ height: '100vh', overflow: 'hidden' }}>
            <VirtualClassroom 
                sessionId={sessionId} 
                participantName={userName}
                isInstructor={false}
            />
        </div>
    );
}
