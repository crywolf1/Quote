import dbConnect from "../../../lib/db";
import Quote from "@/lib/models/Quote";
import QuoteOfTheDayCache from "@/lib/models/QuoteOfTheDayCache";

export async function GET(req) {
  try {
    await dbConnect();

    // Get user's address from URL params
    const url = new URL(req.url);
    const refresh = url.searchParams.get("refresh") === "true";
    const userAddress = url.searchParams.get("address");

    if (!userAddress) {
      return Response.json(
        { success: false, message: "User address required" },
        { status: 400 }
      );
    }

    // Create a unique key for this 12-hour period
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
    const period = now.getHours() < 12 ? "00" : "12";
    const cacheKey = `${userAddress}_${dateKey}-${period}`;

    // If refresh is true, clear the existing cache
    if (refresh) {
      await QuoteOfTheDayCache.findOneAndDelete({ key: cacheKey });
    }

    // Check if we have a cached quote
    let cachedQuote = await QuoteOfTheDayCache.findOne({ key: cacheKey });

    if (cachedQuote && !refresh) {
      // Get the quote from the cache
      const quote = await Quote.findById(cachedQuote.quoteId);

      if (quote) {
        // Check if user has liked this quote
        const isLiked = quote.likedBy && quote.likedBy.includes(userAddress);

        return Response.json({
          success: true,
          quote: {
            ...quote.toObject(),
            isLiked,
          },
        });
      }
    }

    // If no cached quote or refresh requested, get a random quote
    // Query for quotes with tokens that aren't pending
    const query = {
      zoraTokenAddress: { $exists: true, $ne: null },
      isPending: { $ne: true },
    };
    const count = await Quote.countDocuments(query);

    if (count === 0) {
      return Response.json(
        { success: false, message: "No quotes available" },
        { status: 404 }
      );
    }

    // Get a random quote
    const randomIndex = Math.floor(Math.random() * count);
    const randomQuote = await Quote.findOne(query).skip(randomIndex);

    if (!randomQuote) {
      return Response.json(
        { success: false, message: "Failed to fetch quote" },
        { status: 500 }
      );
    }

    // Create a new cache entry
    await QuoteOfTheDayCache.create({
      key: cacheKey,
      quoteId: randomQuote._id,
    });

    // Check if user has liked this quote
    const isLiked =
      randomQuote.likedBy && randomQuote.likedBy.includes(userAddress);

    return Response.json({
      success: true,
      quote: {
        ...randomQuote.toObject(),
        isLiked,
      },
    });
  } catch (error) {
    console.error("Error fetching random quote:", error);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
