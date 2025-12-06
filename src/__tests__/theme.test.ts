import theme from '../theme';

describe('Theme Configuration', () => {
  it('should have color mode configuration', () => {
    expect(theme.config).toBeDefined();
    expect(theme.config.initialColorMode).toBeDefined();
    expect(theme.config.useSystemColorMode).toBeDefined();
  });

  it('should disable system color mode (controlled via store)', () => {
    expect(theme.config.useSystemColorMode).toBe(false);
  });

  it('should have initial color mode as light', () => {
    expect(theme.config.initialColorMode).toBe('light');
  });

  it('should have brand colors', () => {
    expect(theme.colors.brand).toBeDefined();
    expect(theme.colors.brand['500']).toBe('#0967d2');
  });

  it('should have terminal colors', () => {
    expect(theme.colors.terminal).toBeDefined();
    expect(theme.colors.terminal.bg).toBe('#0a0a0a');
    expect(theme.colors.terminal.text).toBe('#00ff00');
  });

  it('should have font configuration', () => {
    expect(theme.fonts).toBeDefined();
    expect(theme.fonts.heading).toBe('Inter, sans-serif');
    expect(theme.fonts.body).toBe('Inter, sans-serif');
  });

  describe('Component Styles', () => {
    it('should have Input component configuration', () => {
      expect(theme.components.Input).toBeDefined();
      expect(theme.components.Input.variants).toBeDefined();
      expect(theme.components.Input.variants.outline).toBeDefined();
    });

    it('should have Select component configuration', () => {
      expect(theme.components.Select).toBeDefined();
      expect(theme.components.Select.variants).toBeDefined();
      expect(theme.components.Select.variants.outline).toBeDefined();
    });

    it('should have Textarea component configuration', () => {
      expect(theme.components.Textarea).toBeDefined();
      expect(theme.components.Textarea.variants).toBeDefined();
      expect(theme.components.Textarea.variants.outline).toBeDefined();
    });

    it('should have FormLabel component configuration', () => {
      expect(theme.components.FormLabel).toBeDefined();
      expect(theme.components.FormLabel.baseStyle).toBeDefined();
    });

    it('should have Card component configuration', () => {
      expect(theme.components.Card).toBeDefined();
      expect(theme.components.Card.baseStyle).toBeDefined();
    });

    it('should have Menu component configuration', () => {
      expect(theme.components.Menu).toBeDefined();
      expect(theme.components.Menu.baseStyle).toBeDefined();
    });

    it('should have Button default props', () => {
      expect(theme.components.Button).toBeDefined();
      expect(theme.components.Button.defaultProps).toBeDefined();
      expect(theme.components.Button.defaultProps.colorScheme).toBe('brand');
    });
  });

  describe('Global Styles', () => {
    it('should have global styles as a function for dynamic mode support', () => {
      expect(theme.styles.global).toBeDefined();
      // With mode() function, global styles are a function not a static object
      expect(typeof theme.styles.global).toBe('function');
    });
  });
});
