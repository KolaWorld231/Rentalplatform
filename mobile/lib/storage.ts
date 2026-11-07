// Hand-ported from ../../lib/supabase/storage.ts -- same public-bucket URL
// shape, kept in sync by hand (see mobile/README.md).
import { supabaseEnv } from "./env";

export function propertyImageUrl(storagePath: string): string {
  return `${supabaseEnv.url}/storage/v1/object/public/property-images/${storagePath}`;
}
