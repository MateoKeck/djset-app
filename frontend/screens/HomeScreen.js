import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getGenreById } from '../data/genres';

const API_URL = 'http://172.31.131.8:5001/generate';

export default function HomeScreen({
  onSetGenerated,
  onOpenHistory,
  onOpenSpotify,
  onOpenGenrePicker,
  selectedGenreId,
  importedSongs,
  onImportedSongsConsumed,
}) {
  const [inputText, setInputText] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const genre = getGenreById(selectedGenreId);

  useEffect(() => {
    if (importedSongs && importedSongs.length > 0) {
      setSongs(importedSongs);
      onImportedSongsConsumed();
    }
  }, [importedSongs]);

  function addSong() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setSongs((prev) => [...prev, trimmed]);
    setInputText('');
    setError(null);
  }

  async function generateSet() {
    if (songs.length === 0) {
      Alert.alert('No songs', 'Add at least one song before generating.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs, genre: selectedGenreId ?? null }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? 'Unknown error from server');
      } else {
        onSetGenerated(json.tracklist, selectedGenreId);
      }
    } catch (err) {
      setError(`Could not reach backend: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function removeSong(index) {
    setSongs((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>DJ Set Generator</Text>
        <Pressable
          onPress={onOpenHistory}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Text style={styles.iconButtonText}>History</Text>
        </Pressable>
      </View>

      {/* Genre selector */}
      <Pressable
        style={({ pressed }) => [
          styles.genreButton,
          genre && { borderColor: genre.color + '88', backgroundColor: genre.color + '12' },
          pressed && { opacity: 0.75 },
        ]}
        onPress={onOpenGenrePicker}
      >
        <View style={styles.genreLeft}>
          {genre ? (
            <>
              <Text style={styles.genreEmoji}>{genre.emoji}</Text>
              <View>
                <Text style={styles.genreLabel}>SET GENRE</Text>
                <Text style={[styles.genreName, { color: genre.color }]}>{genre.name}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.genreEmoji}>🎛️</Text>
              <View>
                <Text style={styles.genreLabel}>SET GENRE</Text>
                <Text style={styles.genreNameEmpty}>Choose a style…</Text>
              </View>
            </>
          )}
        </View>
        {genre && (
          <Text style={[styles.genreBpm, { color: genre.color + 'aa' }]}>
            {genre.bpmRange[0]}–{genre.bpmRange[1]} BPM
          </Text>
        )}
        <Text style={styles.genreArrow}>›</Text>
      </Pressable>

      {/* Spotify import */}
      <Pressable
        style={({ pressed }) => [styles.spotifyButton, pressed && { opacity: 0.75 }]}
        onPress={onOpenSpotify}
      >
        <Text style={styles.spotifyButtonText}>🎵  Import Playlist from Spotify</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or add manually</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter a song name…"
          placeholderTextColor="#555"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={addSong}
          returnKeyType="done"
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={addSong}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {songs.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.sectionLabel}>
            Playlist — {songs.length} track{songs.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={songs}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <View style={styles.songRow}>
                <Text style={styles.songIndex}>{index + 1}</Text>
                <Text style={styles.songName}>{item}</Text>
                <Pressable onPress={() => removeSong(index)} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.generateButton,
          genre && { backgroundColor: genre.color, shadowColor: genre.color },
          pressed && styles.pressed,
          (songs.length === 0 || loading) && styles.disabledButton,
        ]}
        onPress={generateSet}
        disabled={songs.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.generateButtonText}>
            ⚡ Generate {genre ? genre.name : 'DJ'} Set
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  iconButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2a2a45',
  },
  iconButtonText: { color: '#6c47ff', fontSize: 13, fontWeight: '700' },

  // Genre selector
  genreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1e1e35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  genreLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  genreEmoji: { fontSize: 26 },
  genreLabel: { color: '#444', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  genreName: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  genreNameEmpty: { color: '#555', fontSize: 14, fontWeight: '600', marginTop: 1 },
  genreBpm: { fontSize: 11, fontWeight: '600' },
  genreArrow: { color: '#444', fontSize: 20, fontWeight: '300' },

  spotifyButton: {
    backgroundColor: '#0f2417',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1db95444',
    marginBottom: 18,
  },
  spotifyButtonText: { color: '#1db954', fontSize: 14, fontWeight: '700' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e1e35' },
  dividerLabel: { color: '#333', fontSize: 11, fontWeight: '600', letterSpacing: 1 },

  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a45',
  },
  addButton: {
    backgroundColor: '#6c47ff',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pressed: { opacity: 0.7 },

  listContainer: { marginBottom: 16, maxHeight: 200 },
  sectionLabel: {
    color: '#6c47ff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6c47ff',
  },
  songIndex: { color: '#6c47ff', width: 22, fontSize: 13, fontWeight: '700' },
  songName: { flex: 1, color: '#e0e0ff', fontSize: 15 },
  removeText: { color: '#ff3864', fontSize: 13, paddingLeft: 8 },

  errorText: { color: '#ff3864', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  generateButton: {
    backgroundColor: '#6c47ff',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: { opacity: 0.35, shadowOpacity: 0 },
  generateButtonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
