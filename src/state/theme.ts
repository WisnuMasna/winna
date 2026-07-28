// Design tokens for light & dark. Dark mode ships from day one (spec).

export interface Theme {
  dark: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    accent: string;
    // session type accents
    run: string;
    strength: string;
    rest: string;
    cross: string;
    mobility: string;
    // semantic
    danger: string;
    warn: string;
    info: string;
    success: string;
  };
  spacing: (n: number) => number;
  radius: number;
}

const spacing = (n: number) => n * 4;
const radius = 14;

export const lightTheme: Theme = {
  dark: false,
  colors: {
    bg: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F3',
    border: '#E1E4E8',
    text: '#14171A',
    textMuted: '#697077',
    primary: '#1F6FEB',
    primaryText: '#FFFFFF',
    accent: '#0FA47F',
    run: '#1F6FEB',
    strength: '#C2410C',
    rest: '#8A9199',
    cross: '#7C3AED',
    mobility: '#0FA47F',
    danger: '#D1242F',
    warn: '#B5730B',
    info: '#1F6FEB',
    success: '#137A4B',
  },
  spacing,
  radius,
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    bg: '#0D1117',
    surface: '#161B22',
    surfaceAlt: '#1C2230',
    border: '#2A313C',
    text: '#E6EDF3',
    textMuted: '#9199A3',
    primary: '#4C8DFF',
    primaryText: '#0D1117',
    accent: '#2DD4A7',
    run: '#4C8DFF',
    strength: '#F0883E',
    rest: '#6E7681',
    cross: '#A371F7',
    mobility: '#2DD4A7',
    danger: '#FF6B6B',
    warn: '#E3A008',
    info: '#4C8DFF',
    success: '#3FB950',
  },
  spacing,
  radius,
};
