import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GENRES } from '../data/genres';

export default function GenrePickerScreen({ selectedGenreId, onSelect, onBack }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
          hitSlop={10}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>CHOOSE YOUR VIBE</Text>
          <Text style={styles.headerTitle}>Set Genre</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.divider} />

      <FlatList
        data={GENRES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = item.id === selectedGenreId;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { borderColor: selected ? item.color : '#1e1e35' },
                selected && { backgroundColor: item.color + '18' },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => onSelect(item.id)}
            >
              {selected && (
                <View style={[styles.checkBadge, { backgroundColor: item.color }]}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={[styles.cardName, selected && { color: item.color }]}>
                {item.name}
              </Text>
              <Text style={styles.cardBpm}>
                {item.bpmRange[0]}–{item.bpmRange[1]} BPM
              </Text>
              <Text style={styles.cardTagline}>{item.tagline}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d14' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backText: { color: '#6c47ff', fontSize: 15, fontWeight: '600', width: 60 },
  headerCenter: { alignItems: 'center' },
  headerSub: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },

  divider: {
    height: 1,
    backgroundColor: '#1e1e35',
    marginHorizontal: 20,
    marginBottom: 8,
  },

  grid: { padding: 16, paddingBottom: 40 },
  row: { gap: 12 },

  card: {
    flex: 1,
    backgroundColor: '#12121f',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#000', fontSize: 11, fontWeight: '900' },

  cardEmoji: { fontSize: 28, marginBottom: 4 },
  cardName: { color: '#e8e8ff', fontSize: 15, fontWeight: '700' },
  cardBpm: { color: '#555', fontSize: 11, fontWeight: '600' },
  cardTagline: { color: '#444', fontSize: 11, marginTop: 2 },
});
