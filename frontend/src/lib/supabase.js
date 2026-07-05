import {
createClient,
} from '@supabase/supabase-js';

import {
environment,
validateEnvironment,
} from './environment';

validateEnvironment();

const supabaseUrl =
environment.supabaseUrl;

const supabaseKey =
environment.supabaseKey;

const GLOBAL_CLIENT_KEY =
'**internnext_supabase_client**';

function createSupabaseClient() {
return createClient(
supabaseUrl,
supabaseKey,
{
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true,
flowType: 'pkce',
},
}
);
}

export const supabase =
globalThis[
GLOBAL_CLIENT_KEY
] ||
createSupabaseClient();

if (import.meta.env.DEV) {
globalThis[
GLOBAL_CLIENT_KEY
] = supabase;
}
