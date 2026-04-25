import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';

const API_BASE = 'http://172.31.131.8:5001';
const CARD_ACCENTS = ['#00e5ff', '#6c47ff', '#ff00de', '#39ff14', '#ff9500', '#ff3864'];

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayerScreen({ onBack, tracks, transitions = [] }) {
  const [mixStatus, setMixStatus] = useState('mixing'); // 'mixing' | 'ready' | 'error'
  const [mixError, setMixError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef(null);
  const mixUrlRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    triggerMix();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function triggerMix() {
    try {
      const res = await fetch(`${API_BASE}/mix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks, transitions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Mix failed');
      mixUrlRef.current = `${API_BASE}${json.url}`;
      setMixStatus('ready');
    } catch (err) {
      setMixError(String(err));
      setMixStatus('error');
    }
  }

  function onPlaybackStatus(st) {
    if (!st.isLoaded) return;
    setPosition(st.positionMillis ?? 0);
    setDuration(st.durationMillis ?? 0);
    if (st.didJustFinish) setIsPlaying(false);
  }

  async function togglePlay() {
    if (!mixUrlRef.current) return;

    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: mixUrlRef.current },
        { shouldPlay: true },
        onPlaybackStatus
      );
      soundRef.current = sound;
      setIsPlaying(true);
      return;
    }

    const st = await soundRef.current.getStatusAsync();
    if (st.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>MIXER</Text>
          <Text style={styles.headerTitle}>DJ Set Player</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Track list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{tracks.length} TRACKS IN MIX</Text>
        {tracks.map((track, index) => {
          const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
          const isActive = mixStatus === 'ready' && isPlaying;
          return (
            <View key={track.id ?? index} style={[styles.trackCard, { borderLeftColor: accent }]}>
              <View style={[styles.indexBadge, { backgroundColor: accent + '22', borderColor: accent }]}>
                {isActive && index === 0 ? (
                  <Text style={[styles.playingDot, { color: accent }]}>♫</Text>
                ) : (
                  <Text style={[styles.indexText, { color: accent }]}>{index + 1}</Text>
                )}
              </View>
              <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Player panel */}
      <View style={styles.playerPanel}>
        {mixStatus === 'mixing' && (
          <View style={styles.mixingState}>
            <ActivityIndicator color="#6c47ff" size="large" />
            <Text style={styles.mixingText}>Mixing {tracks.length} tracks…</Text>
            <Text style={styles.mixingHint}>FFmpeg is processing your audio</Text>
          </View>
        )}

        {mixStatus === 'error' && (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>{mixError}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
              onPress={() => { setMixStatus('mixing'); setMixError(null); triggerMix(); }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {mixStatus === 'ready' && (
          <>
            {/* Progress */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.75 }]}
              onPress={togglePlay}
            >
              <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              <Text style={styles.playText}>{isPlaying ? 'Pause' : 'Play Mix'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
    paddingTop: 56,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backText: { color: '#6c47ff', fontSize: 15, fontWeight: '600', width: 60 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 12 },
  sectionLabel: {
    color: '#6c47ff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    gap: 12,
  },
  indexBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { fontSize: 12, fontWeight: '800' },
  playingDot: { fontSize: 14, fontWeight: '800' },
  trackName: { flex: 1, color: '#e0e0ff', fontSize: 14, fontWeight: '600' },

  playerPanel: {
    backgroundColor: '#0a0a12',
    borderTopWidth: 1,
    borderTopColor: '#1e1e35',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },

  mixingState: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  mixingText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  mixingHint: { color: '#444', fontSize: 12 },

  errorState: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  errorText: { color: '#ff3864', fontSize: 13, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ff386444',
  },
  retryText: { color: '#ff3864', fontWeight: '700', fontSize: 13 },

  progressTrack: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#1e1e35',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    backgroundColor: '#6c47ff',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeText: { color: '#444', fontSize: 11, fontWeight: '600' },

  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6c47ff',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  playIcon: { color: '#fff', fontSize: 18 },
  playText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
