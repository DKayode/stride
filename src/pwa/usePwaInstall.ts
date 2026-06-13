import { useEffect, useState } from 'react';

/** The non-standard `beforeinstallprompt` event (not in the TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Detect whether the app is running as an installed PWA / TWA rather than in a
 * browser tab. Checks the standalone display mode, the iOS Safari
 * `navigator.standalone` flag, and the Android TWA `android-app://` referrer.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const androidTwa = document.referrer.startsWith('android-app://');
  return displayStandalone || iosStandalone || androidTwa;
}

interface PwaInstall {
  /** True only when a prompt is available AND the app isn't already installed. */
  canInstall: boolean;
  standalone: boolean;
  /** Trigger the native install prompt; resolves once the choice is made. */
  promptInstall: () => Promise<void>;
}

/**
 * Manage the PWA install affordance: capture `beforeinstallprompt`, expose
 * whether an install can be offered, and hide it once installed / standalone.
 */
export function usePwaInstall(): PwaInstall {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar so we can present our own button.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const mql = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => setStandalone(isStandalone());
    mql.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      mql.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const promptInstall = async (): Promise<void> => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // A prompt can only be used once; drop it regardless of the outcome.
    setDeferred(null);
  };

  return {
    canInstall: deferred !== null && !standalone,
    standalone,
    promptInstall,
  };
}
