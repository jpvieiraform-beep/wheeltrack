import { createClient } from '@supabase/supabase-js';

// Substitui estes valores pelas tuas credenciais reais do Supabase API Settings
const supabaseUrl = 'https://xmopkisvoxpnrorlexfz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtb3BraXN2b3hwbnJvcmxleGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzQyNDksImV4cCI6MjA5NTA1MDI0OX0.RYIzM5h_IDc33PiqDNsNh33pfgkG8aHjhDYakp1cWrs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);