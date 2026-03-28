import { describe, it, expect } from 'vitest';

describe('Buyer Search Engine API Keys', () => {
  it('should have all required API keys configured', () => {
    expect(process.env.SERPER_API_KEY).toBeDefined();
    expect(process.env.SERPER_API_KEY?.length).toBeGreaterThan(30);
  });

  it('should have Google Places API key configured', () => {
    expect(process.env.GOOGLE_PLACES_API_KEY).toBeDefined();
    expect(process.env.GOOGLE_PLACES_API_KEY).toMatch(/^AIza/);
  });

  it('should have AMap API key configured', () => {
    expect(process.env.AMAP_KEY).toBeDefined();
    expect(process.env.AMAP_KEY).toMatch(/^[a-f0-9]{32}$/);
  });

  it('should have Kimi API key configured', () => {
    expect(process.env.KIMI_API_KEY).toBeDefined();
    expect(process.env.KIMI_API_KEY).toMatch(/^sk-/);
  });
});
