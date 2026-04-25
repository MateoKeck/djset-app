import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';

const API_BASE = 'http://172.31.131.8:5001';
const CARD_ACCENTS = ['#00e5ff', '#6c47ff', '#ff00de', '#39ff14', '#ff9500', '#ff3864'];

export default function UploadScreen({ onBack, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function pickFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.uri));
        const fresh = result.assets.filter((a) => !existing.has(a.uri));
        return [...prev, ...fresh];
      });
      setError(null);
    } catch {
      setError('Could not open file picker.');
    }
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadAndMix() {
    if (files.length === 0) {
      Alert.alert('No files', 'Pick at least one audio file.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append('files', {
          uri: f.uri,
          name: f.name,
          type: f.mimeType || 'audio/mpeg',
        });
      }
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onUploadComplete(json.files);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

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
          <Text style={styles.headerLabel}>AUDIO FILES</Text>
          <Text style={styles.headerTitle}>Upload Tracks</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <Pressable
        style={({ pressed }) => [styles.pickButton, pressed && { opacity: 0.75 }]}
        onPress={pickFiles}
      >
        <Text style={styles.pickButtonText}>+ Pick Audio Files</Text>
      </Pressable>

      {files.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.sectionLabel}>
            {files.length} track{files.length !== 1 ? 's' : ''} selected
          </Text>
          <FlatList
            data={files}
            keyExtractor={(item) => item.uri}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
              return (
                <View style={[styles.fileRow, { borderLeftColor: accent }]}>
                  <View style={[styles.indexBadge, { backgroundColor: accent + '22', borderColor: accent }]}>
                    <Text style={[styles.indexText, { color: accent }]}>{index + 1}</Text>
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                    {item.size != null && (
                      <Text style={styles.fileSize}>{(item.size / 1024 / 1024).toFixed(1)} MB</Text>
                    )}
                  </View>
                  <Pressable onPress={() => removeFile(index)} hitSlop={8}>
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.mixButton,
          pressed && { opacity: 0.75 },
          (files.length === 0 || uploading) && styles.disabledButton,
        ]}
        onPress={uploadAndMix}
        disabled={files.length === 0 || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.mixButtonText}>⬆  Upload & Mix</Text>
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
    paddingTop: 56,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: { color: '#6c47ff', fontSize: 15, fontWeight: '600', width: 60 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },

  pickButton: {
    backgroundColor: '#12121f',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6c47ff55',
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  pickButtonText: { color: '#6c47ff', fontSize: 15, fontWeight: '700' },

  listSection: { flex: 1, marginBottom: 16 },
  sectionLabel: {
    color: '#6c47ff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 10,
    paddingVertical: 12,
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
  fileInfo: { flex: 1 },
  fileName: { color: '#e0e0ff', fontSize: 14, fontWeight: '600' },
  fileSize: { color: '#444', fontSize: 11, marginTop: 2 },
  removeText: { color: '#ff3864', fontSize: 13 },

  errorText: { color: '#ff3864', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  mixButton: {
    backgroundColor: '#6c47ff',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: { opacity: 0.35, shadowOpacity: 0 },
  mixButtonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
