interface Settings {
  lightTheme: boolean;
  readerIsPaginated: boolean;
  readerFontSize: number;
  uuid: string;
  serverAddress: string;
};

const SETTINGS_KEY = "settings";
const DEFAULT_SETTINGS: Settings = {
  lightTheme: false,
  readerIsPaginated: true,
  readerFontSize: 25,
  uuid: "",
  serverAddress: ""
};

/** This function loads the settings from the localStorage, if its null
 * it just returns the default settings.
 */
export function load() {
  const settings = window.localStorage.getItem(SETTINGS_KEY);
  if (!settings) return DEFAULT_SETTINGS;

  const currentSettings: Settings = JSON.parse(settings);
  return { ...DEFAULT_SETTINGS, ...currentSettings };
}

export function update(settings: Settings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
