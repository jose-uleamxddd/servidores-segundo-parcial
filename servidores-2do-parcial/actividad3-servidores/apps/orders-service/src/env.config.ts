// Cargar variables de entorno desde .env.supabase
import { config } from 'dotenv';
import { join } from 'path';

// Cargar .env.supabase desde la raíz del proyecto
config({ path: join(__dirname, '..', '..', '..', '.env.supabase') });
