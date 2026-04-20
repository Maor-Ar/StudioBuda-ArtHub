import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions, Platform } from 'react-native';

const TooltipIcon = ({ text, label = 'ⓘ', maxWidth = 280 }) => {
  const isWeb = Platform.OS === 'web';
  const triggerRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [openMode, setOpenMode] = useState('press');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 260 });

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const openTooltip = () => {
    const win = Dimensions.get('window');
    const desiredWidth = Math.min(320, Math.max(220, Number(maxWidth) || 280));
    const margin = 12;
    const estimatedHeight = 96;

    const measure = () => {
      if (!triggerRef.current?.measureInWindow) {
        setPosition({
          left: Math.max(margin, win.width - desiredWidth - margin),
          top: margin + 36,
          width: desiredWidth,
        });
        setOpen(true);
        return;
      }

      triggerRef.current.measureInWindow((x, y, w, h) => {
        const left = Math.min(
          Math.max(margin, x + w - desiredWidth),
          Math.max(margin, win.width - desiredWidth - margin)
        );
        const belowTop = y + h + 8;
        const aboveTop = y - estimatedHeight - 8;
        const top =
          belowTop + estimatedHeight > win.height - margin
            ? Math.max(margin, aboveTop)
            : belowTop;

        setPosition({ left, top, width: desiredWidth });
        setOpen(true);
      });
    };

    requestAnimationFrame(measure);
  };

  const scheduleHoverOpen = () => {
    if (!isWeb) return;
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setOpenMode('hover');
      openTooltip();
    }, 220);
  };

  useEffect(() => {
    if (!isWeb || !open || openMode !== 'hover' || typeof window === 'undefined') {
      return undefined;
    }

    const closeOnMove = () => setOpen(false);
    window.addEventListener('mousemove', closeOnMove, { once: true });
    return () => window.removeEventListener('mousemove', closeOnMove);
  }, [isWeb, open, openMode]);

  useEffect(() => () => clearHoverTimer(), []);

  if (!text) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        ref={triggerRef}
        onPress={() => {
          if (isWeb) {
            return;
          }
          clearHoverTimer();
          if (open) {
            setOpen(false);
          } else {
            setOpenMode('press');
            openTooltip();
          }
        }}
        onHoverIn={() => {
          if (!isWeb) return;
          scheduleHoverOpen();
        }}
        onHoverOut={() => {
          if (!isWeb) return;
          clearHoverTimer();
          setOpen(false);
        }}
        onMouseMove={() => {
          if (!isWeb || open) return;
          // Open only when cursor pauses on the trigger.
          scheduleHoverOpen();
        }}
        style={styles.trigger}
      >
        <Text style={styles.triggerText}>{label}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {isWeb && openMode === 'hover' ? (
          <View style={styles.overlay} pointerEvents="none">
            <View style={[styles.bubble, { left: position.left, top: position.top, width: position.width }]}>
              <Text style={styles.text}>{text}</Text>
            </View>
          </View>
        ) : (
          <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
            <View style={[styles.bubble, { left: position.left, top: position.top, width: position.width }]}>
              <Text style={styles.text}>{text}</Text>
            </View>
          </Pressable>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'flex-end',
    zIndex: 50,
  },
  trigger: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    zIndex: 3,
  },
  triggerText: {
    color: '#D4B8E0',
    fontSize: 12,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#3D225F',
    borderColor: 'rgba(255, 209, 227, 0.35)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 60,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  text: {
    color: '#FFE2ED',
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
});

export default TooltipIcon;
