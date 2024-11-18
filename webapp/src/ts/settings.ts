export interface ISettings {
  lightTheme: boolean;
  readerIsPaginated: boolean;
  readerFontSize: number;
  uuid: string;
  serverAddress: string;
};

const SETTINGS_KEY = "settings";
const DEFAULT_SETTINGS: ISettings = {
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

  const currentSettings: ISettings = JSON.parse(settings);
  return { ...DEFAULT_SETTINGS, ...currentSettings };
}

export function update(settings: ISettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
