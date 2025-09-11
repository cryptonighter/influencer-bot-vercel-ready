import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
'your_supabase_project_url',  // Replace with your Supabase URL
'your_supabase_service_role_key'  // Replace with your service role key
)

supabase.from('users').select('*').limit(1).then(result => {
console.log('Success:', result.data)
}).catch(error => {
console.log('Error:', error.message)
})