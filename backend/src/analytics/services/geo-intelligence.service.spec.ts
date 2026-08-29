import { GeoIntelligenceService } from './geo-intelligence.service';

describe('GeoIntelligenceService', () => {
  const service = new GeoIntelligenceService();

  it('should extract GPS coordinates from Google Maps URLs and raw strings', () => {
    const pin1 = service.extractLocationFromMessage(
      'msg1',
      'Alice',
      new Date('2026-08-24T10:00:00Z'),
      'Meet me here https://maps.google.com/?q=37.7749,-122.4194',
    );

    expect(pin1).not.toBeNull();
    expect(pin1?.latitude).toBeCloseTo(37.7749);
    expect(pin1?.longitude).toBeCloseTo(-122.4194);
    expect(pin1?.source).toBe('google-maps');

    const pin2 = service.extractLocationFromMessage(
      'msg2',
      'Bob',
      new Date('2026-08-24T10:15:00Z'),
      'Current GPS: 37.7833, -122.4167',
    );

    expect(pin2).not.toBeNull();
    expect(pin2?.latitude).toBeCloseTo(37.7833);
    expect(pin2?.longitude).toBeCloseTo(-122.4167);
  });

  it('should calculate Haversine distance and cluster nearby points', () => {
    // SF to Oakland is ~13 km
    const dist = service.calculateDistanceKm(37.7749, -122.4194, 37.8044, -122.2712);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(20);

    const pinA = {
      id: 'p1',
      actor: 'Alice',
      timestamp: new Date('2026-08-24T10:00:00Z'),
      latitude: 37.7749,
      longitude: -122.4194,
      source: 'raw-coords',
    };
    const pinB = {
      id: 'p2',
      actor: 'Bob',
      timestamp: new Date('2026-08-24T10:05:00Z'),
      latitude: 37.7752,
      longitude: -122.4190, // ~50m away
      source: 'raw-coords',
    };

    const clusters = service.clusterLocationPins([pinA, pinB], 1);
    expect(clusters.length).toBe(1);
    expect(clusters[0].pinCount).toBe(2);
    expect(clusters[0].actors).toContain('Alice');
    expect(clusters[0].actors).toContain('Bob');
  });

  it('should build chronological route segments with velocity estimates', () => {
    const pinA = {
      id: 'p1',
      actor: 'Alice',
      timestamp: new Date('2026-08-24T10:00:00Z'),
      latitude: 37.7749,
      longitude: -122.4194,
      source: 'raw-coords',
    };
    const pinB = {
      id: 'p2',
      actor: 'Alice',
      timestamp: new Date('2026-08-24T10:30:00Z'),
      latitude: 37.8044,
      longitude: -122.2712,
      source: 'raw-coords',
    };

    const routes = service.buildRouteSegments([pinA, pinB]);
    expect(routes.length).toBe(1);
    expect(routes[0].timeDiffMinutes).toBe(30);
    expect(routes[0].impliedSpeedKmh).toBeGreaterThan(20);
  });
});
