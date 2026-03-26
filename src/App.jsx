import React, { useState, useEffect } from 'react'
import koalaImg from './assets/koala.png'
import './App.css'

// Internal Components
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import Typing from './components/Typing';

// New Split Components
import Dashboard from './components/Dashboard';
import CategoryList from './components/CategoryList';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';

function App() {
  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  const userName = tgUser?.first_name || 'Student';
  const userPhoto = tgUser?.photo_url || koalaImg;
  const tgId = tgUser?.id || 12345;

  // --- STATE MANAGEMENT ---
  const [view, setView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allWords, setAllWords] = useState([]); // Now holds ONLY the active session words
  const [language, setLanguage] = useState('fr');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [autoPlaySound, setAutoPlaySound] = useState(true);
  const [activeModes, setActiveModes] = useState({ flashcard: true, quiz: true, typing: true });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [exerciseType, setExerciseType] = useState('flashcard');
  const [feedback, setFeedback] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [categoryList, setCategoryList] = useState([]);

  // Derived Word State
  const currentWord = allWords[currentIndex];

  // --- 1. INITIAL LOAD: SETTINGS ---
  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
    fetch(`/api/user/${tgId}`)
      .then(res => res.json())
      .then(data => {
        setLanguage(data.language || 'fr');
        setAutoPlaySound(data.autoPlaySound ?? true);
        // Load the saved modes from the DB
        if (data.activeModes) {
          setActiveModes(data.activeModes);
        }
        setSettingsLoaded(true);
      }).catch(() => setSettingsLoaded(true));
  }, [tgId]);

  // --- 2. FETCH CATEGORY MENU ---
  useEffect(() => {
    if (!settingsLoaded) return;
    fetch(`/api/categories?lang=${language}`)
      .then(res => res.json())
      .then(data => setCategoryList(data))
      .catch(err => console.error("Failed to fetch categories", err));
  }, [language, settingsLoaded]);

  // --- 3. FETCH IMAGES FOR STUDY ---
  useEffect(() => {
    if (view === 'study' && currentWord) {
      setCurrentImage(null);
      fetch(`/api/image?word=${encodeURIComponent(currentWord.word)}&search_term=${encodeURIComponent(currentWord.definition)}`)
        .then(res => res.json())
        .then(data => setCurrentImage(data.image_url))
        .catch(() => { });
    }
  }, [currentWord, view]);

  // --- 4. GENERATE QUIZ OPTIONS ---
  useEffect(() => {
    if (view !== 'study' || !currentWord || exerciseType !== 'quiz') return;

    const others = allWords
      .filter(w => w.word !== currentWord.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(w => w.word);

    const fallbacks = language === 'fr' ? ['Chat', 'Chien', 'Maison'] : ['Cat', 'Dog', 'House'];
    let finalOthers = [...others];
    while (finalOthers.length < 3) {
      const fb = fallbacks.pop();
      if (fb && !finalOthers.includes(fb)) finalOthers.push(fb);
    }
    setCurrentOptions([currentWord.word, ...finalOthers].sort(() => 0.5 - Math.random()));
  }, [currentIndex, view, exerciseType]);

  // Auto-play sound whenever the word changes during study
  useEffect(() => {
    if (view === 'study' && currentWord && autoPlaySound) {
      // Small delay to ensure the UI has rendered and user is ready
      const timer = setTimeout(() => {
        speakText(currentWord.word, language);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, view, autoPlaySound]);
  // --- HELPERS ---

  const speakText = (text, langCode) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isFrench = langCode === 'fr';

    // 1. Set the intended language string
    utterance.lang = isFrench ? 'fr-FR' : 'en-US';

    const findAndSetVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const isFrench = langCode === 'fr';

      // 1. Create a priority list for English
      // We look for "Natural", "Google", or "Enhanced" in the name
      const englishPriorities = ['natural', 'google', 'premium', 'enhanced', 'apple'];

      let bestVoice = null;

      if (isFrench) {
        // Priority for French (Premium voices like "Amélie" or "Thomas")
        bestVoice = voices.find(v => v.lang.includes('fr') &&
          (v.name.toLowerCase().includes('premium') || v.name.toLowerCase().includes('google')));
        if (!bestVoice) bestVoice = voices.find(v => v.lang.includes('fr'));
      } else {
        // Priority for English (Looking for "Natural" voices first)
        for (const priority of englishPriorities) {
          bestVoice = voices.find(v =>
            v.lang.startsWith('en') && v.name.toLowerCase().includes(priority)
          );
          if (bestVoice) break;
        }
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // 2. Adjust these for a more "human" flow
      utterance.rate = 0.9;  // Slightly slower is more natural
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    // Chrome/Telegram Desktop Fix: wait for voices to load
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = findAndSetVoice;
    } else {
      findAndSetVoice();
    }
  };
  const handleLanguageChange = (l) => {
    setLanguage(l);
    saveSettings({ language: l });
  };

  const handleAutoPlayChange = (v) => {
    setAutoPlaySound(v);
    saveSettings({ autoPlaySound: v });
  };

  const handleModeToggle = (modeName) => {
    const newModes = { ...activeModes, [modeName]: !activeModes[modeName] };

    if (!Object.values(newModes).some(val => val)) return;

    setActiveModes(newModes);

    saveSettings({ activeModes: newModes });
  };

  const saveSettings = (updatedFields) => {
    fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tg_id: tgId,
        language,
        autoPlaySound,
        activeModes,
        ...updatedFields
      })
    });
  };

  const getCategoryStyle = (catName) => {
    const styles = {
      'Food': { icon: '🍎', type: 'light-orange' },
      'Work': { icon: '💼', type: 'light-green' },
      'Travel': { icon: '✈️', type: 'light-green' },
      'Home': { icon: '🏠', type: 'light-blue' },
      'Advanced': { icon: '🚀', type: 'light-blue' },
      'Celpip Advice': { icon: '🇨🇦', type: 'light-orange' },
      'Workplace': { icon: '🏢', type: 'light-green' },
      'Advice': { icon: '💡', type: 'light-orange' },
      'Exam': { icon: '📝', type: 'light-grey' },
    };
    return styles[catName] || { icon: '📁', type: 'light-grey' };
  };

  const categories = categoryList.map((cat, i) => {
    const style = getCategoryStyle(cat.title);
    return {
      id: i,
      title: cat.title,
      icon: style.icon,
      type: style.type,
      count: cat.count
    };
  });

  const startStudy = (cat) => {
    setLoadingWords(true);
    fetch(`/api/words?lang=${language}&category=${encodeURIComponent(cat.title)}`)
      .then(res => res.json())
      .then(data => {
        setAllWords(data);
        setSelectedCategory(cat.title);
        setCurrentIndex(0);
        setLoadingWords(false);
        setView('study');

        const available = Object.keys(activeModes).filter(k => activeModes[k]);
        setExerciseType(activeModes.flashcard ? 'flashcard' : available[0]);
      })
      .catch(() => setLoadingWords(false));
  };

  const handleNext = () => {
    if (currentIndex < allWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const available = Object.keys(activeModes).filter(k => activeModes[k]);
      setExerciseType(available[Math.floor(Math.random() * available.length)]);
      setFeedback(null);
    } else {
      setView('dashboard');
    }
  };

  const checkAnswer = (ans) => {
    if (ans.toLowerCase().trim() === currentWord.word.toLowerCase()) {
      setFeedback('correct');
      // Ensure 'language' here is 'fr' when studying French words
      if (autoPlaySound) speakText(currentWord.word, language);
      setTimeout(handleNext, 1200);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  // --- RENDER ---
  if (!settingsLoaded) return <div className="app-container"><h2>Loading...</h2></div>;

  return (
    <div className="app-container">
      {loadingWords && <div className="feedback" style={{ background: 'rgba(0,0,0,0.5)' }}>Loading Session...</div>}

      {view === 'dashboard' && (
        <Dashboard userPhoto={userPhoto} userName={userName} setView={setView} koalaImg={koalaImg} />
      )}

      {view === 'vocabulary' && (
        <CategoryList categories={categories} onSelectCategory={startStudy} />
      )}

      {view === 'settings' && (
        <Settings
          language={language}
          handleLanguageChange={handleLanguageChange}
          autoPlaySound={autoPlaySound}
          handleAutoPlayChange={handleAutoPlayChange}
          activeModes={activeModes}
          handleModeToggle={handleModeToggle}
        />
      )}

      {view === 'study' && currentWord && (
        <div className="study-view">
          <div className="study-header">
            <button className="back-btn" onClick={() => setView('dashboard')}>✕ Close</button>
            <div className="progress-text">Word {currentIndex + 1} of {allWords.length}</div>
          </div>

          {exerciseType === 'flashcard' && (
            <Flashcard
              word={currentWord}
              image={currentImage}
              onNext={handleNext}
              speakText={speakText}
              language={language}
              autoPlay={autoPlaySound} 
            />
          )}
          {exerciseType === 'quiz' && (
            <Quiz word={currentWord} image={currentImage} options={currentOptions} checkAnswer={checkAnswer} speakText={speakText} language={language} feedback={feedback} />
          )}
          {exerciseType === 'typing' && (
            <Typing word={currentWord} image={currentImage} checkAnswer={checkAnswer} speakText={speakText} language={language} feedback={feedback} />
          )}

          {feedback === 'correct' && <div className="feedback correct">✅ Correct!</div>}
          {feedback === 'wrong' && <div className="feedback wrong">❌ Try again</div>}
        </div>
      )}

      {(view === 'dashboard' || view === 'settings' || view === 'vocabulary') && (
        <BottomNav view={view} setView={setView} />
      )}
    </div>
  )
}

export default App;