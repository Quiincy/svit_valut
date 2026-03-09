import { useState, useEffect, useCallback, useRef } from 'react';

// Path to standard iOS-compatible M4A audio file (Glass sound)
const NOTIFICATION_AUDIO_PATH = '/audio/notification.m4a';
const VOLUME_STORAGE_KEY = 'notificationVolume';

export function useAudioNotification() {
    const interactedRef = useRef(false);
    const [volume, setVolumeState] = useState(() => {
        const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
        return saved !== null ? parseFloat(saved) : 1.0;
    });

    const setVolume = useCallback((newVolume) => {
        const v = Math.max(0, Math.min(1, newVolume));
        setVolumeState(v);
        localStorage.setItem(VOLUME_STORAGE_KEY, String(v));
    }, []);

    useEffect(() => {
        // Create the element physically in the HTML document
        let audioEl = document.getElementById('global-notification-audio');
        if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = 'global-notification-audio';
            audioEl.src = NOTIFICATION_AUDIO_PATH;
            audioEl.preload = 'auto';
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
        }

        const handleInteraction = () => {
            if (interactedRef.current) return;
            interactedRef.current = true;

            // Unlock audio on iOS/Safari by playing a silent note initially
            try {
                const el = document.getElementById('global-notification-audio');
                if (el) {
                    el.volume = 0;
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            el.pause();
                            el.currentTime = 0;
                        }).catch(() => { });
                    }
                }
            } catch (e) { }

            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };

        // Require one user interaction to unlock the audio context for the browser
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    const playNotification = useCallback(() => {
        if (!interactedRef.current) {
            console.warn("Audio skipped: user hasn't interacted with the page yet");
            return;
        }

        if (volume === 0) return; // Muted

        try {
            const el = document.getElementById('global-notification-audio');
            if (el) {
                el.volume = volume;
                el.currentTime = 0;
                const playPromise = el.play();

                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Audio playback prevented by browser policy.", error);
                    });
                }
            }
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    }, [volume]);

    return { playNotification, volume, setVolume };
}
