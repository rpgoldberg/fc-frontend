import theme, { createTheme } from '../theme';

describe('Theme Configuration', () => {
  it('should have color mode configuration', () => {
    expect(theme.config).toBeDefined();
    expect(theme.config.initialColorMode).toBeDefined();
    expect(theme.config.useSystemColorMode).toBeDefined();
  });

  it('should disable system color mode (controlled via store)', () => {
    expect(theme.config.useSystemColorMode).toBe(false);
  });

  it('should have global styles object', () => {
    expect(theme.styles.global).toBeDefined();
    expect(typeof theme.styles.global).toBe('object');
  });

  it('should have brand colors', () => {
    expect(theme.colors.brand).toBeDefined();
    expect(theme.colors.brand['500']).toBe('#0967d2');
  });

  describe('createTheme function', () => {
    it('should create light theme with correct styles', () => {
      const lightTheme = createTheme('light');
      expect(lightTheme.styles.global.body.bg).toBe('white');
      expect(lightTheme.styles.global.body.color).toBe('gray.900');
    });

    it('should create dark theme with correct styles', () => {
      const darkTheme = createTheme('dark');
      expect(darkTheme.styles.global.body.bg).toBe('gray.900');
      expect(darkTheme.styles.global.body.color).toBe('gray.50');
    });

    it('should create terminal theme with green colors', () => {
      const terminalTheme = createTheme('terminal');
      expect(terminalTheme.styles.global.body.bg).toBe('#0a0a0a');
      expect(terminalTheme.styles.global.body.color).toBe('#00ff00');
      expect(terminalTheme.fonts.body).toContain('Courier');
    });

    it('should have different brand colors for terminal theme', () => {
      const lightTheme = createTheme('light');
      const terminalTheme = createTheme('terminal');
      expect(lightTheme.colors.brand['500']).not.toBe(terminalTheme.colors.brand['500']);
      expect(terminalTheme.colors.brand['900']).toBe('#00ff00'); // Matrix green
    });
  });
});
