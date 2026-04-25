import { Share, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const FALLBACK_TRANSITIONS = [
  { label: 'Smooth Blend',    color: '#00e5ff' },
  { label: 'Beat Match Drop', color: '#ff00de' },
  { label: 'Filter Sweep',    color: '#39ff14' },
  { label: 'Bass Drop',       color: '#ff9500' },
  { label: 'Echo Roll Out',   color: '#00e5ff' },
  { label: 'Backspin Cut',    color: '#ff3864' },
  { label: 'Loop Punch',      color: '#ff00de' },
  { label: 'Fade & Lock',     color: '#39ff14' },
];

const CARD_ACCENTS = ['#00e5ff', '#6c47ff', '#ff00de', '#39ff14', '#ff9500', '#ff3864'];

function getTransition(track, index) {
  if (track.transition_to_next) return track.transition_to_next;
  return FALLBACK_TRANSITIONS[index % FALLBACK_TRANSITIONS.length];
}

function buildShareText(tracklist) {
  const lines = ['🎧 DJ Set\n'];
  tracklist.forEach((track, i) => {
    const bpm = track.tempo ? ` (${track.tempo} BPM)` : '';
    lines.push(`${i + 1}. ${track.name}${bpm}`);
    if (i < tracklist.length - 1) {
      const t = getTransition(track, i);
      lines.push(`   ↓ ${t.label}`);
    }
  });
  lines.push('\nGenerated with DJ Set Generator');
  return lines.join('\n');
}

export default function SetResultScreen({ tracklist, onBack, readOnly }) {
  async function handleShare() {
    try {
      await Share.share({ message: buildShareText(tracklist) });
    } catch (_) {}
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>NOW PLAYING</Text>
          <Text style={styles.headerTitle}>DJ Set</Text>
        </View>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Text style={styles.shareText}>Share ↑</Text>
        </Pressable>
      </View>

      {/* Track count bar */}
      <View style={styles.metaBar}>
        <Text style={styles.metaItem}>
          <Text style={styles.metaValue}>{tracklist.length}</Text>
          {'  '}TRACKS
        </Text>
        {tracklist.some((t) => t.tempo) && (
          <Text style={styles.metaItem}>
            <Text style={styles.metaValue}>
              {Math.round(
                tracklist.filter((t) => t.tempo).reduce((s, t) => s + t.tempo, 0) /
                  tracklist.filter((t) => t.tempo).length
              )}
            </Text>
            {'  '}AVG BPM
          </Text>
        )}
        <Text style={styles.metaItem}>
          <Text style={styles.metaValue}>
            {tracklist.filter((t) => t.transition_to_next).length > 0 ? '✓' : '—'}
          </Text>
          {'  '}AI MIX
        </Text>
      </View>

      <View style={styles.divider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tracklist.map((track, index) => {
          const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
          const transition = getTransition(track, index);

          return (
            <View key={index}>
              {/* Song Card */}
              <View style={[styles.songCard, { borderLeftColor: accent }]}>
                <View style={[styles.indexBadge, { backgroundColor: accent + '22', borderColor: accent }]}>
                  <Text style={[styles.indexText, { color: accent }]}>{index + 1}</Text>
                </View>
                <View style={styles.songInfo}>
                  <Text style={styles.songName}>{track.name}</Text>
                  <View style={styles.songMeta}>
                    {track.tempo && (
                      <Text style={styles.metaChip}>{track.tempo} BPM</Text>
                    )}
                    {track.energy != null && (
                      <Text style={styles.metaChip}>
                        {track.energy >= 0.7 ? '🔥' : track.energy >= 0.4 ? '⚡' : '🌊'}{' '}
                        {track.energy >= 0.7 ? 'High' : track.energy >= 0.4 ? 'Mid' : 'Low'} Energy
                      </Text>
                    )}
                    {index === 0 && <Text style={styles.tagChip}>OPENER</Text>}
                    {index === tracklist.length - 1 && <Text style={styles.tagChip}>CLOSER</Text>}
                  </View>
                </View>
                <Text style={[styles.noteIcon, { color: accent }]}>♫</Text>
              </View>

              {/* Transition */}
              {index < tracklist.length - 1 && (
                <View style={styles.transitionRow}>
                  <View style={[styles.connectorLine, { backgroundColor: transition.color + '44' }]} />
                  <View style={[styles.transitionBadge, {
                    borderColor: transition.color + '99',
                    backgroundColor: transition.color + '18',
                  }]}>
                    <Text style={[styles.transitionIcon, { color: transition.color }]}>⟳</Text>
                    <Text style={[styles.transitionLabel, { color: transition.color }]}>
                      {transition.label}
                    </Text>
                  </View>
                  <View style={[styles.connectorLine, { backgroundColor: transition.color + '44' }]} />
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>▬▬▬  SET COMPLETE  ▬▬▬</Text>
        </View>
      </ScrollView>

      {!readOnly && (
        <Pressable
          style={({ pressed }) => [styles.newSetButton, pressed && { opacity: 0.75 }]}
          onPress={onBack}
        >
          <Text style={styles.newSetText}>⚡ Build New Set</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backText: { color: '#6c47ff', fontSize: 15, fontWeight: '600', width: 60 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  shareButton: { width: 60, alignItems: 'flex-end' },
  shareText: { color: '#00e5ff', fontSize: 13, fontWeight: '700' },

  metaBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  metaItem: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  metaValue: { color: '#fff', fontSize: 18, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#1e1e35', marginHorizontal: 20 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },

  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  indexBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  indexText: { fontSize: 13, fontWeight: '800' },
  songInfo: { flex: 1, gap: 5 },
  songName: { color: '#e8e8ff', fontSize: 15, fontWeight: '600' },
  songMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagChip: {
    color: '#6c47ff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: '#6c47ff22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  noteIcon: { fontSize: 18, marginLeft: 8 },

  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  connectorLine: { flex: 1, height: 1 },
  transitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginHorizontal: 10,
  },
  transitionIcon: { fontSize: 12, fontWeight: '700' },
  transitionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  footer: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  footerText: { color: '#2a2a45', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  newSetButton: {
    margin: 20,
    backgroundColor: '#6c47ff',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  newSetText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
