import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
export interface UserLocation {
  latitude: number;
  longitude: number;
  country: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  private googleApiKey = 'AIzaSyB0V1g5YyGB_NE1Lw1QitZZGECA5-1Xnng'; // replace if using Google Maps
  private useIpFallback = true; // set false if you want only GPS

  constructor(private http: HttpClient) { }

  /**
   * Get user's location + country name
   */
  async getUserLocation(): Promise<UserLocation> {
    try {
    
      const coords = await this.getCurrentLocation();
    
      const country = await this.getCountryFromCoords(coords.latitude, coords.longitude);
      return { ...coords, country };
    } catch (error) {
      if (this.useIpFallback) {
        console.warn('Geolocation failed, using IP fallback', error);
        const country = await this.getCountryFromIP();
        return { latitude: 0, longitude: 0, country }; 
      }
      throw error;
    }
  }

  /**
   * Get browser GPS coordinates
   */
  private getCurrentLocation(): Promise<{ latitude: number, longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported by browser.');
      } else {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          err => reject(err.message),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    });
  }

  /**
   * Convert coordinates to country name using Google Maps API
   */
  private async getCountryFromCoords(lat: number, lng: number): Promise<string> {
    if (!this.googleApiKey) return 'Unknown';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
    try {
      const result: any = await this.http.get(url).toPromise();
      if (result?.results?.length) {
        const addressComponents = result.results[0].address_components;
        const country = addressComponents.find((comp: any) => comp.types.includes('country'));
        return country?.long_name || 'Unknown';
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Fallback: get country from IP
   */
  private async getCountryFromIP(): Promise<string> {
    try {
      const res: any = await this.http.get('https://ipapi.co/json/').toPromise();
      return res?.country_name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}
