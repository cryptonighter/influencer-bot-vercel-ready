import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
'https://lmmqowhlyzrvckwibvwe.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbXFvd2hseXpydmNrd2lidndlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ1Mjc5MSwiZXhwIjoyMDcyMDI4NzkxfQ.8deSkx1h6OJpWyGGn4bpOU0x0F33uZBxsCUb6VUgBF0'  // Replace with your key
)

supabase.from('users').select('*').limit(1).then(result => {
console.log('Success:', result.data)
}).catch(error => {
console.log('Error:', error.message)
})
