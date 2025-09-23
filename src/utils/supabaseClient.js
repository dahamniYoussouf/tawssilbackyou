import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://ruuirjmkvdjonkddxwfi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dWlyam1rdmRqb25rZGR4d2ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUyNTI5NCwiZXhwIjoyMDc0MTAxMjk0fQ.77y0Pi-OTnxT1xaHOj2rnfjrlLQTJQcCbzfJOhHSDmc'
);

export default supabase;
