import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoId, category } = body;

    if (!videoId || !category) {
      return NextResponse.json(
        { error: "Missing videoId or category in the request body" },
        { status: 400 }
      );
    }

    // Upsert category into the `categories` table
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .upsert({ category_name: category }, { onConflict: "category_name" })
      .select("category_id")
      .single();

    if (categoryError) {
      console.error("Error adding/updating category:", categoryError);
      return NextResponse.json(
        { error: "Failed to add/update category" },
        { status: 500 }
      );
    }

    const categoryId = categoryData.category_id;

    // Associate category with the video in the `video_categories` table
    const { error: associationError } = await supabase
      .from("video_categories")
      .insert({ video_id: videoId, category_id: categoryId });

    if (associationError) {
      console.error("Error associating category with video:", associationError);
      return NextResponse.json(
        { error: "Failed to associate category with video" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Category added successfully",
      categoryId,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
