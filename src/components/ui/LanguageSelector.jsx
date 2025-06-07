// LanguageSelector.jsx
import { useEffect, useState } from 'react';
import { ChevronDown } from "lucide-react";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' }
];

function getDefaultLanguage(countryCode, state) {
  if (countryCode === 'IN') {
    switch (state) {
      case 'Kerala': return 'Malayalam';
      case 'Maharashtra': return 'Marathi';
      case 'Karnataka': return 'Kannada';
      case 'Tamil Nadu': return 'Tamil';
      case 'Andhra Pradesh': return 'Telugu';
      case 'West Bengal': return 'Bengali';
      case 'Gujarat': return 'Gujarati';
      case 'Punjab': return 'Punjabi';
      case 'Rajasthan': return 'Hindi';
      case 'Uttar Pradesh':
      case 'Madhya Pradesh':
      case 'Bihar':
      case 'Haryana':
      case 'Delhi':
        return 'Hindi';
      default: return 'Hindi';
    }
  }
  switch (countryCode) {
    case 'US': return 'English';
    case 'ES': return 'Spanish';
    case 'FR': return 'French';
    case 'DE': return 'German';
    case 'JP': return 'Japanese';
    default: return 'English';
  }
}

export function LanguageSelector() {
  const [selectedLang, setSelectedLang] = useState('Detecting...');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setSelectedLang('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const lang = getDefaultLanguage(data.countryCode, data.principalSubdivision);
          setSelectedLang(lang);
        } catch (err) {
          console.error('Location fetch failed', err);
          setSelectedLang('Error fetching location');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setSelectedLang('Location access denied');
      }
    );
  }, []);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen((prev) => !prev);
        }}
        className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 rounded shadow flex items-center gap-1"
      >
        {selectedLang}
        <ChevronDown className="w-4 h-4" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  selectedLang === lang.name ? 'font-bold bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onClick={() => {
                  setSelectedLang(lang.name);
                  setDropdownOpen(false);
                  console.log(`Language changed to: ${lang.name}`);
                }}
              >
                {lang.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}