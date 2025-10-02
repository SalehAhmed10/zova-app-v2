import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Seed service categories
    const categories = [
      {
        name: 'Home Services',
        description: 'Services for home maintenance and improvement',
        service_subcategories: [
          { name: 'Cleaning', description: 'House cleaning services' },
          { name: 'Plumbing', description: 'Plumbing repairs and installations' },
          { name: 'Electrical', description: 'Electrical work and repairs' },
          { name: 'Carpentry', description: 'Woodworking and carpentry services' },
          { name: 'Painting', description: 'Interior and exterior painting' },
          { name: 'Landscaping', description: 'Garden and yard maintenance' }
        ]
      },
      {
        name: 'Personal Care',
        description: 'Personal care and wellness services',
        service_subcategories: [
          { name: 'Hair Styling', description: 'Hair cutting and styling' },
          { name: 'Massage', description: 'Therapeutic massage services' },
          { name: 'Nail Care', description: 'Manicure and pedicure services' },
          { name: 'Personal Training', description: 'Fitness training and coaching' },
          { name: 'Nutrition Consulting', description: 'Diet and nutrition advice' },
          { name: 'Spa Treatments', description: 'Relaxation and beauty treatments' }
        ]
      },
      {
        name: 'Automotive',
        description: 'Car maintenance and repair services',
        service_subcategories: [
          { name: 'Car Wash', description: 'Vehicle cleaning services' },
          { name: 'Oil Change', description: 'Engine oil changes and maintenance' },
          { name: 'Tire Service', description: 'Tire repairs and replacements' },
          { name: 'Detailing', description: 'Professional car detailing' },
          { name: 'Repair Services', description: 'General automotive repairs' },
          { name: 'Towing', description: 'Emergency towing services' }
        ]
      },
      {
        name: 'Professional Services',
        description: 'Business and professional services',
        service_subcategories: [
          { name: 'Consulting', description: 'Business consulting services' },
          { name: 'Tutoring', description: 'Educational tutoring services' },
          { name: 'Legal Services', description: 'Legal advice and services' },
          { name: 'Accounting', description: 'Financial and accounting services' },
          { name: 'Photography', description: 'Professional photography services' },
          { name: 'Event Planning', description: 'Event coordination and planning' }
        ]
      },
      {
        name: 'Health & Medical',
        description: 'Healthcare and medical services',
        service_subcategories: [
          { name: 'Home Healthcare', description: 'In-home medical care' },
          { name: 'Physical Therapy', description: 'Rehabilitation services' },
          { name: 'Mental Health', description: 'Counseling and therapy services' },
          { name: 'Dental Care', description: 'Dental services and consultations' },
          { name: 'Vision Care', description: 'Eye care and optometry services' },
          { name: 'Alternative Medicine', description: 'Holistic and alternative treatments' }
        ]
      }
    ]

    // Insert categories and subcategories
    for (const category of categories) {
      // Insert category
      const { data: categoryData, error: categoryError } = await supabase
        .from('service_categories')
        .insert({
          name: category.name,
          description: category.description
        })
        .select()
        .single()

      if (categoryError) {
        console.error('Error inserting category:', categoryError)
        continue
      }

      // Insert subcategories
      const subcategoriesToInsert = category.service_subcategories.map(sub => ({
        category_id: categoryData.id,
        name: sub.name,
        description: sub.description
      }))

      const { error: subcategoryError } = await supabase
        .from('service_subcategories')
        .insert(subcategoriesToInsert)

      if (subcategoryError) {
        console.error('Error inserting subcategories for', category.name, subcategoryError)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Service categories seeded successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error seeding categories:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})