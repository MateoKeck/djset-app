import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// ⚠️  Paste your Spotify app's Client ID here (no secret needed — we use PKCE).
//    Create one at https://developer.spotify.com/dashboard
//    Add these Redirect URIs in your Spotify app settings:
//      • exp://172.31.131.8:8081   (Expo Go on your network)
//      • djsetapp://               (standalone build)
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function SpotifyImportScreen({ onBack, onImport }) {
  const [accessToken, setAccessToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState(null);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'djsetapp' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: ['playlist-read-private', 'playlist-read-collaborative'],
      usePKCE: true,
      redirectUri,
    },
    DISCOVERY
  );

  // Exchange auth code for access token once Spotify redirects back
  useEffect(() => {
    if (response?.type !== 'success') return;
    setError(null);
    AuthSession.exchangeCodeAsync(
      {
        clientId: SPOTIFY_CLIENT_ID,
        code: response.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      DISCOVERY
    )
      .then((tokenResp) => {
        setAccessToken(tokenResp.accessToken);
        fetchPlaylists(tokenResp.accessToken);
      })
      .catch(() => setError('Failed to exchange token. Try again.'));
  }, [response]);

  async function fetchPlaylists(token) {
    setLoadingPlaylists(true);
    try {
      const resp = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setPlaylists(data.items ?? []);
    } catch {
      setError('Could not load playlists.');
    } finally {
      setLoadingPlaylists(false);
    }
  }

  async function importPlaylist(playlist) {
    setLoadingTracks(true);
    setError(null);
    try {
      const songs = [];
      let url = `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50&fields=items(track(name,artists))`;
      // Follow pagination to get all tracks (cap at 100)
      while (url && songs.length < 100) {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await resp.json();
        for (const item of data.items ?? []) {
          if (item.track?.name) {
            const artist = item.track.artists?.[0]?.name;
            songs.push(artist ? `${item.track.name} - ${artist}` : item.track.name);
          }
        }
        url = data.next;
      }
      onImport(songs);
    } catch {
      setError('Failed to load tracks.');
    } finally {
      setLoadingTracks(false);
    }
  }

  const notConfigured = SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          hitSlop={10}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Import from Spotify</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.divider} />

      {notConfigured ? (
        <View style={styles.centered}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Spotify not configured</Text>
          <Text style={styles.warningBody}>
            Open {`screens/SpotifyImportScreen.js`} and replace{' '}
            <Text style={styles.code}>YOUR_SPOTIFY_CLIENT_ID</Text> with your app's
            Client ID from{' '}
            <Text style={styles.code}>developer.spotify.com/dashboard</Text>.
          </Text>
        </View>
      ) : !accessToken ? (
        <View style={styles.centered}>
          <Text style={styles.spotifyIcon}>🎵</Text>
          <Text style={styles.promptText}>Connect your Spotify account to import a playlist.</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            style={({ pressed }) => [styles.connectButton, pressed && { opacity: 0.75 }, !request && styles.disabledButton]}
            onPress={() => promptAsync()}
            disabled={!request}
          >
            <Text style={styles.connectText}>Connect Spotify</Text>
          </Pressable>
          <Text style={styles.redirectNote}>Redirect URI (add to Spotify dashboard):{'\n'}{redirectUri}</Text>
        </View>
      ) : loadingPlaylists ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1db954" size="large" />
          <Text style={styles.loadingText}>Loading playlists…</Text>
        </View>
      ) : loadingTracks ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1db954" size="large" />
          <Text style={styles.loadingText}>Importing tracks…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Your Playlists — tap one to import</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.playlistCard, pressed && { opacity: 0.75 }]}
                onPress={() => importPlaylist(item)}
              >
                <View style={styles.playlistIcon}>
                  <Text style={styles.playlistIconText}>♫</Text>
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistName}>{item.name}</Text>
                  <Text style={styles.playlistMeta}>
                    {item.tracks?.total ?? '?'} tracks
                    {item.owner?.display_name ? ` · ${item.owner.display_name}` : ''}
                  </Text>
                </View>
                <Text style={styles.importArrow}>→</Text>
              </Pressable>
            )}
          />
        </>
      )}
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
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#1e1e35', marginHorizontal: 20, marginBottom: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  spotifyIcon: { fontSize: 56 },
  promptText: { color: '#aaa', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  errorText: { color: '#ff3864', fontSize: 13, textAlign: 'center' },
  connectButton: {
    backgroundColor: '#1db954',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 36,
    shadowColor: '#1db954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  connectText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabledButton: { opacity: 0.4 },
  redirectNote: {
    color: '#333',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  warningIcon: { fontSize: 40 },
  warningTitle: { color: '#ff9500', fontSize: 17, fontWeight: '700' },
  warningBody: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  code: { color: '#00e5ff', fontFamily: 'monospace' },
  loadingText: { color: '#555', fontSize: 14, marginTop: 12 },
  sectionLabel: {
    color: '#6c47ff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 24 },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 12,
    padding: 14,
    gap: 14,
  },
  playlistIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#1db954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistIconText: { color: '#1db954', fontSize: 18 },
  playlistInfo: { flex: 1 },
  playlistName: { color: '#e8e8ff', fontSize: 15, fontWeight: '600' },
  playlistMeta: { color: '#555', fontSize: 12, marginTop: 2 },
  importArrow: { color: '#1db954', fontSize: 18, fontWeight: '700' },
});
