'use client';

import MessagesPage from '@/components/messages/MessagesPage';

export default function Page() {
    // Admin layout has p-8 on <main> — escape it with -m-8 so we get the full viewport height
    return (
        <div className="-m-8" style={{ height: 'calc(100vh - 4rem)' }}>
            <MessagesPage />
        </div>
    );
}
