import { Injectable, Logger } from '@nestjs/common';

export interface GeoLocationPin {
  id: string;
  latitude: number;
  longitude: number;
  actor: string;
  timestamp: Date;
  label?: string;
  source: string; // 'google-maps' | 'apple-maps' | 'telegram-pin' | 'raw-coords'
}

export interface GeoCluster {
  centroid: { latitude: number; longitude: number };
  pinCount: number;
  actors: string[];
  firstSeen: Date;
  lastSeen: Date;
  radiusKm: number;
}

export interface GeoRouteSegment {
  from: GeoLocationPin;
  to: GeoLocationPin;
  distanceKm: number;
  timeDiffMinutes: number;
  impliedSpeedKmh: number;
}

@Injectable()
export class GeoIntelligenceService {
  private readonly logger = new Logger(GeoIntelligenceService.name);

  /**
   * Extracts location pins from message text, URLs, and metadata
   */
  extractLocationFromMessage(
    id: string,
    actor: string,
    timestamp: Date,
    content: string,
    metadata?: any,
  ): GeoLocationPin | null {
    // 1. Check metadata.location first
    if (metadata?.location?.lat && metadata?.location?.lng) {
      return {
        id,
        actor,
        timestamp,
        latitude: parseFloat(metadata.location.lat),
        longitude: parseFloat(metadata.location.lng),
        source: 'telegram-pin',
      };
    }

    // 2. Check Google Maps URLs (e.g., https://maps.google.com/?q=37.7749,-122.4194 or https://www.google.com/maps/place/37.7749,-122.4194)
    const gmapsMatch = content.match(/(?:maps\.google\.com\/(?:maps)?\?q=|google\.com\/maps\/place\/|maps\.apple\.com\/\?ll=)(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (gmapsMatch) {
      return {
        id,
        actor,
        timestamp,
        latitude: parseFloat(gmapsMatch[1]),
        longitude: parseFloat(gmapsMatch[2]),
        source: content.includes('apple.com') ? 'apple-maps' : 'google-maps',
      };
    }

    // 3. Check raw coordinates: "Location: 37.7749, -122.4194" or "Lat: 37.7749, Lon: -122.4194"
    const rawMatch = content.match(/(?:Location|GPS|Coordinates|Lat|geo):\s*(-?\d{1,3}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/i);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          id,
          actor,
          timestamp,
          latitude: lat,
          longitude: lng,
          source: 'raw-coords',
        };
      }
    }

    return null;
  }

  /**
   * Computes Haversine distance in kilometers between two GPS coordinates
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Clusters geographic pins within a given proximity radius (in km)
   */
  clusterLocationPins(pins: GeoLocationPin[], radiusKm = 5): GeoCluster[] {
    if (!pins.length) return [];
    const visited = new Set<string>();
    const clusters: GeoCluster[] = [];

    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      if (visited.has(pin.id)) continue;

      const group = [pin];
      visited.add(pin.id);

      for (let j = i + 1; j < pins.length; j++) {
        const other = pins[j];
        if (visited.has(other.id)) continue;

        const dist = this.calculateDistanceKm(pin.latitude, pin.longitude, other.latitude, other.longitude);
        if (dist <= radiusKm) {
          group.push(other);
          visited.add(other.id);
        }
      }

      const sumLat = group.reduce((acc, p) => acc + p.latitude, 0);
      const sumLng = group.reduce((acc, p) => acc + p.longitude, 0);
      const actors = Array.from(new Set(group.map((p) => p.actor)));
      const timestamps = group.map((p) => p.timestamp.getTime());

      clusters.push({
        centroid: {
          latitude: parseFloat((sumLat / group.length).toFixed(5)),
          longitude: parseFloat((sumLng / group.length).toFixed(5)),
        },
        pinCount: group.length,
        actors,
        firstSeen: new Date(Math.min(...timestamps)),
        lastSeen: new Date(Math.max(...timestamps)),
        radiusKm,
      });
    }

    return clusters;
  }

  /**
   * Generates chronological route trajectories and velocity estimates
   */
  buildRouteSegments(pins: GeoLocationPin[]): GeoRouteSegment[] {
    const sorted = [...pins].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const segments: GeoRouteSegment[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const dist = this.calculateDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
      const timeDiffMinutes = Math.max(1, Math.round((to.timestamp.getTime() - from.timestamp.getTime()) / (1000 * 60)));
      const impliedSpeedKmh = parseFloat(((dist / (timeDiffMinutes / 60))).toFixed(1));

      segments.push({
        from,
        to,
        distanceKm: dist,
        timeDiffMinutes,
        impliedSpeedKmh,
      });
    }

    return segments;
  }
}
