import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './screens/HomeScreen';
import SetResultScreen from './screens/SetResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import SpotifyImportScreen from './screens/SpotifyImportScreen';
import GenrePickerScreen from './screens/GenrePickerScreen';
import { saveSetToHistory } from './screens/HistoryScreen';

const GENRE_STORAGE_KEY = '@djset_selected_genre';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [tracklist, setTracklist] = useState([]);
  const [resultReadOnly, setResultReadOnly] = useState(false);
  const [pendingSongs, setPendingSongs] = useState(null);
  const [selectedGenreId, setSelectedGenreId] = useState(null);

  // Restore last-used genre on launch
  useEffect(() => {
    AsyncStorage.getItem(GENRE_STORAGE_KEY).then((id) => {
      if (id) setSelectedGenreId(id);
    });
  }, []);

  function handleSelectGenre(id) {
    setSelectedGenreId(id);
    AsyncStorage.setItem(GENRE_STORAGE_KEY, id);
    setScreen('home');
  }

  function handleSetGenerated(tracks, genreId) {
    setTracklist(tracks);
    setResultReadOnly(false);
    setScreen('results');
    saveSetToHistory(tracks, genreId);
  }

  function handleViewHistorySet(tracks) {
    setTracklist(tracks);
    setResultReadOnly(true);
    setScreen('results');
  }

  function handleSpotifyImport(songs) {
    setPendingSongs(songs);
    setScreen('home');
  }

  if (screen === 'genre-picker') {
    return (
      <GenrePickerScreen
        selectedGenreId={selectedGenreId}
        onSelect={handleSelectGenre}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'results') {
    return (
      <SetResultScreen
        tracklist={tracklist}
        readOnly={resultReadOnly}
        onBack={() => setScreen(resultReadOnly ? 'history' : 'home')}
      />
    );
  }

  if (screen === 'history') {
    return (
      <HistoryScreen
        onBack={() => setScreen('home')}
        onViewSet={handleViewHistorySet}
      />
    );
  }

  if (screen === 'spotify-import') {
    return (
      <SpotifyImportScreen
        onBack={() => setScreen('home')}
        onImport={handleSpotifyImport}
      />
    );
  }

  return (
    <HomeScreen
      onSetGenerated={handleSetGenerated}
      onOpenHistory={() => setScreen('history')}
      onOpenSpotify={() => setScreen('spotify-import')}
      onOpenGenrePicker={() => setScreen('genre-picker')}
      selectedGenreId={selectedGenreId}
      importedSongs={pendingSongs}
      onImportedSongsConsumed={() => setPendingSongs(null)}
    />
  );
}
