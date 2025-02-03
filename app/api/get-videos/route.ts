import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are not set.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    // Parse query parameters if needed (e.g., pagination, filters)
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // Fetch videos from Supabase
    const { data: videos, error } = await supabase
      .from("videos")
      .select("*")
      .range(offset, offset + limit - 1); // Apply pagination

    if (error) {
      console.error("Error fetching videos:", error);
      return NextResponse.json(
        { error: "Failed to fetch videos" },
        { status: 500 }
      );
    }
    console.log(videos)
    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
