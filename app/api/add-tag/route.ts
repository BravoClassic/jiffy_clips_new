import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoId, tag } = body;

    if (!videoId || !tag) {
      return NextResponse.json(
        { error: "Missing videoId or tag in the request body" },
        { status: 400 }
      );
    }

    // Upsert tag into the `tags` table
    const { data: tagData, error: tagError } = await supabase
      .from("tags")
      .upsert({ tag_name: tag }, { onConflict: "tag_name" })
      .select("tag_id")
      .single();

    if (tagError) {
      console.error("Error adding/updating tag:", tagError);
      return NextResponse.json(
        { error: "Failed to add/update tag" },
        { status: 500 }
      );
    }

    const tagId = tagData.tag_id;

    // Associate tag with the video in the `video_tags` table
    const { error: associationError } = await supabase
      .from("video_tags")
      .insert({ video_id: videoId, tag_id: tagId });

    if (associationError) {
      console.error("Error associating tag with video:", associationError);
      return NextResponse.json(
        { error: "Failed to associate tag with video" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Tag added successfully", tagId });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
