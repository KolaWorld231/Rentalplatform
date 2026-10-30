import { supabaseEnv } from "./env";

export function propertyImageUrl(storagePath: string): string {
  return `${supabaseEnv.url}/storage/v1/object/public/property-images/${storagePath}`;
}
