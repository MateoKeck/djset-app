import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGenreById } from '../data/genres';

export const HISTORY_KEY = '@djset_history';

export async function saveSetToHistory(tracklist, genreId) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift({
      id: String(Date.now()),
      date: new Date().toISOString(),
      genreId: genreId ?? null,
      tracklist,
    });
    // Keep last 50 sets
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (_) {}
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryScreen({ onBack, onViewSet }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => setHistory(raw ? JSON.parse(raw) : []))
      .finally(() => setLoading(false));
  }, []);

  async function deleteEntry(id) {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Set History</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.divider} />

      {loading ? (
        <Text style={styles.emptyText}>Loading…</Text>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎛️</Text>
          <Text style={styles.emptyText}>No sets yet.</Text>
          <Text style={styles.emptySubtext}>Generate your first DJ set to see it here.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              onPress={() => onViewSet(item.tracklist)}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardTracks}>
                    {item.tracklist.length} track{item.tracklist.length !== 1 ? 's' : ''}
                  </Text>
                  {item.genreId && (() => {
                    const g = getGenreById(item.genreId);
                    return g ? (
                      <Text style={[styles.cardGenre, { color: g.color }]}>
                        {g.emoji} {g.name}
                      </Text>
                    ) : null;
                  })()}
                </View>
                <Text style={styles.cardPreview} numberOfLines={1}>
                  {item.tracklist.map((t) => t.name).join(' · ')}
                </Text>
              </View>
              <Pressable
                onPress={() => deleteEntry(item.id)}
                hitSlop={10}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={styles.deleteText}>✕</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {},
  backText: {
    color: '#6c47ff',
    fontSize: 15,
    fontWeight: '600',
    width: 60,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e1e35',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#6c47ff',
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  cardDate: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTracks: {
    color: '#00e5ff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardGenre: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardPreview: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  deleteText: {
    color: '#ff3864',
    fontSize: 16,
    paddingLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#333',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
