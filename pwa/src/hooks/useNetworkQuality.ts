'use client';

import { useEffect, useState } from 'react';

export type NetworkQuality = 'offline' | 'slow' | 'good';

export interface NetworkInfo {
    quality: NetworkQuality;
    effectiveType: string;
    isOnline: boolean;
    downlink?: number;
    rtt?: number;
}

export function useNetworkQuality(): NetworkInfo {
    const [info, setInfo] = useState<NetworkInfo>({
        quality: 'good',
        effectiveType: '4g',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    });

    useEffect(() => {
        const connection =
            (navigator as any).connection ||
            (navigator as any).mozConnection ||
            (navigator as any).webkitConnection;

        const update = () => {
            const online = navigator.onLine;

            if (!online) {
                setInfo({ quality: 'offline', effectiveType: 'none', isOnline: false });
                return;
            }

            const effectiveType: string = connection?.effectiveType || '4g';
            const downlink: number | undefined = connection?.downlink;
            const rtt: number | undefined = connection?.rtt;

            const isSlow =
                ['slow-2g', '2g'].includes(effectiveType) ||
                (rtt !== undefined && rtt > 500) ||
                (downlink !== undefined && downlink < 0.5);

            setInfo({ quality: isSlow ? 'slow' : 'good', effectiveType, isOnline: true, downlink, rtt });
        };

        update();
        connection?.addEventListener('change', update);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);

        return () => {
            connection?.removeEventListener('change', update);
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    return info;
}
