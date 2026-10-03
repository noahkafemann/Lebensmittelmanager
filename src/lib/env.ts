const required = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${key}`)
  }

  return value
}

export const env = {
  supabaseUrl: required(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL'),
  supabaseAnonKey: required(
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    'VITE_SUPABASE_ANON_KEY',
  ),
  appBasePath: import.meta.env.BASE_URL,
}
