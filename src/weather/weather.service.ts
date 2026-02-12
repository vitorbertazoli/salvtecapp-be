import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WeatherService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService
  ) {}

  async getWeather() {
    const city = 'campinas,sp,brazil';
    const cacheKey = `weather:${city.toLowerCase()}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('OpenWeatherMap API key not configured');
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      // Cache for 10 minutes
      await this.cacheManager.set(cacheKey, data, 600000);

      return data;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch weather data: ${error.message}`);
    }
  }
}
