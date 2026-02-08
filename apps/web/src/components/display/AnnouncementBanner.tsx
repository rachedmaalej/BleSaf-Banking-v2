import { useEffect, useState, useCallback } from 'react';

interface Announcement {
  id: string;
  message: string;
  messageAr?: string;
  priority: 'normal' | 'urgent';
  enableTts: boolean;
  displayDuration: number;
  createdBy: string;
  createdAt: string;
}

interface AnnouncementBannerProps {
  announcement: Announcement | null;
  language?: 'fr' | 'ar';
  onDismiss: () => void;
  /** Callback when visibility changes - used to push hero content */
  onVisibilityChange?: (isVisible: boolean) => void;
  /** Variant: 'bottom' (default) or 'right' for slide-right in hero section */
  variant?: 'bottom' | 'right';
}

// SG Brand Colors with transparency
const COLORS = {
  normal: {
    bg: 'rgba(26, 26, 26, 0.75)', // #1A1A1A with 75% opacity
    solid: '#1A1A1A',
  },
  urgent: {
    bg: 'rgba(233, 4, 30, 0.78)', // #E9041E with 78% opacity
    solid: '#E9041E',
  },
};

export function AnnouncementBanner({
  announcement,
  language = 'fr',
  onDismiss,
  onVisibilityChange,
  variant = 'bottom',
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Notify parent when visibility changes
  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  // Text-to-speech
  const speakMessage = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ar' ? 'ar-TN' : 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  useEffect(() => {
    if (announcement) {
      // Show banner with slide-up animation
      setIsVisible(true);
      setProgress(100);

      // Speak if TTS enabled
      if (announcement.enableTts) {
        const text = language === 'ar' && announcement.messageAr
          ? announcement.messageAr
          : announcement.message;
        speakMessage(text);
      }

      // Progress bar countdown
      const interval = setInterval(() => {
        setProgress((prev) => {
          const decrement = 100 / (announcement.displayDuration * 10); // Update every 100ms
          const newProgress = prev - decrement;
          if (newProgress <= 0) {
            clearInterval(interval);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      // Auto-dismiss after duration
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, announcement.displayDuration * 1000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        window.speechSynthesis.cancel();
      };
    } else {
      setIsVisible(false);
    }
  }, [announcement, language, onDismiss, speakMessage]);

  if (!announcement) return null;

  const displayMessage = language === 'ar' && announcement.messageAr
    ? announcement.messageAr
    : announcement.message;

  const colorScheme = COLORS[announcement.priority] || COLORS.normal;
  const isUrgent = announcement.priority === 'urgent';

  // Dynamic font size based on message length
  const getMessageFontSize = (text: string): string => {
    const length = text.length;
    if (length <= 50) return '52px';
    if (length <= 80) return '44px';
    if (length <= 120) return '36px';
    if (length <= 160) return '30px';
    return '26px';
  };

  const messageFontSize = getMessageFontSize(displayMessage);

  // Right variant: slides from right, designed for hero section only
  if (variant === 'right') {
    // Dynamic font size for right variant (narrower width)
    const getRightVariantFontSize = (text: string): string => {
      const length = text.length;
      if (length <= 40) return '36px';
      if (length <= 70) return '30px';
      if (length <= 100) return '26px';
      if (length <= 140) return '22px';
      return '18px';
    };

    const rightFontSize = getRightVariantFontSize(displayMessage);

    return (
      <>
        <style>{`
          @keyframes slideFromRight {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideToRight {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
          }
          .announcement-right-enter {
            animation: slideFromRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .announcement-right-exit {
            animation: slideToRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
        <div
          className={`flex flex-col h-full ${isVisible ? 'announcement-right-enter' : 'announcement-right-exit'}`}
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: colorScheme.bg,
            borderRadius: '16px 0 0 16px',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          }}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Progress bar - at top */}
          <div
            className="h-1.5 w-full flex-shrink-0"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <div
              className="h-full transition-all duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                backgroundColor: isUrgent ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
              }}
            />
          </div>

          {/* Content area - flex column centered */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            {/* Icon */}
            <span
              className="material-symbols-outlined text-white"
              style={{
                fontSize: '56px',
                filter: isUrgent ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))' : undefined,
              }}
            >
              {isUrgent ? 'warning' : 'campaign'}
            </span>

            {/* Message */}
            <p
              className="text-white font-semibold leading-snug text-center"
              style={{
                fontSize: rightFontSize,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              {displayMessage}
            </p>
          </div>

          {/* Dismiss button - at bottom */}
          <div className="flex-shrink-0 p-4 flex justify-center">
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300);
              }}
              className="text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>close</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Default bottom variant
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{ height: '33.333vh' }} // Fill the bottom 1/3 of the screen
    >
      {/* Progress bar - on top of banner */}
      <div
        className="h-2"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
      >
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: isUrgent ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
          }}
        />
      </div>

      {/* Banner content - full height */}
      <div
        className="h-full px-12 flex items-center gap-10"
        style={{
          backgroundColor: colorScheme.bg,
        }}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Icon with subtle glow for urgent */}
        <span
          className="material-symbols-outlined text-white flex-shrink-0"
          style={{
            fontSize: '72px',
            filter: isUrgent ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))' : undefined,
          }}
        >
          {isUrgent ? 'warning' : 'campaign'}
        </span>

        {/* Message */}
        <div className="flex-1 flex items-center">
          <p
            className="text-white font-semibold leading-snug"
            style={{
              fontSize: messageFontSize,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            {displayMessage}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-white/50 hover:text-white transition-colors flex-shrink-0 hover:scale-110 transform duration-150"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>close</span>
        </button>
      </div>
    </div>
  );
}

export default AnnouncementBanner;
