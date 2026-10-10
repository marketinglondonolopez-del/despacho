import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/dispatch_db?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  WHATSAPP_PHONE_NUMBER_ID: z.string().default('mock_phone_number_id'),
  WHATSAPP_ACCESS_TOKEN: z.string().default('mock_access_token'),
  WHATSAPP_VERIFY_TOKEN: z.string().default('whatsapp_verify_token_secret'),
  WHATSAPP_APP_SECRET: z.string().default('mock_app_secret'),
  WHATSAPP_API_VERSION: z.string().default('v20.0'),

  MAPS_PROVIDER: z.enum(['google', 'mapbox', 'mock']).default('mock'),
  MAPS_API_KEY: z.string().default('mock_maps_api_key'),

  JWT_SECRET: z.string().default('super_secret_jwt_key_at_least_32_characters_long_for_security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  DEFAULT_ROUND_1_DRIVERS: z.coerce.number().default(3),
  DEFAULT_ROUND_1_TIMEOUT_SEC: z.coerce.number().default(15),
  DEFAULT_ROUND_2_DRIVERS: z.coerce.number().default(5),
  DEFAULT_ROUND_2_TIMEOUT_SEC: z.coerce.number().default(20),
  DEFAULT_MAX_SEARCH_RADIUS_KM: z.coerce.number().default(8.0),
  GPS_STALE_THRESHOLD_SECONDS: z.coerce.number().default(45),
  MIN_REVIEWS_FOR_STABLE_REPUTATION: z.coerce.number().default(50),
});

export const env = envSchema.parse(process.env);
