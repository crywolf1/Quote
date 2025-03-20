export async function POST(req) {
  try {
    const body = await req.json(); // Parse incoming request body

    console.log("Farcaster Frame Payload:", body);

    // Extract user data from Farcaster request
    const { fid, buttonIndex } = body;

    // Mocked response based on button clicked
    let responseText = "Welcome to the Quote App!";
    if (buttonIndex === 1) {
      responseText =
        "Here's a random quote: 'Success is not final, failure is not fatal.'";
    } else if (buttonIndex === 2) {
      responseText = "Submit your quote at: https://your-site.com/add-quote";
    }

    return Response.json({
      "fc:frame": "vNext",
      "fc:frame:image": "/assets/phone.png", // Replace with your hosted image
      "fc:frame:post_url":
        "https://quote-production-679a.up.railway.app/api/frame-action",
      "fc:frame:button:1": "Get Another Quote",
      "fc:frame:button:2": "Add Your Own",
      "fc:frame:text": responseText,
    });
  } catch (error) {
    console.error("Error processing Farcaster request:", error);
    return new Response("Error", { status: 500 });
  }
}
