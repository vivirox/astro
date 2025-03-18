import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'subject', 'message'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Missing required field: ${field}`,
          }),
          { status: 400 }
        );
      }
    }
    
    // In a real application, you would:
    // 1. Validate the email format
    // 2. Check for spam
    // 3. Store the message in a database
    // 4. Send an email notification
    // 5. Maybe add the user to a CRM
    
    console.log('Contact form submission:', data);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your message has been received. We will get back to you soon!',
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An error occurred while processing your request. Please try again later.',
      }),
      { status: 500 }
    );
  }
}; 