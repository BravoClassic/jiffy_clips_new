import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid"; // For generating unique file names
import {supabaseClientUtil} from "../../../utils/supabaseClient"


// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are not set.");
}



export async function POST(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header missing" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1]; // Extract the token from the header

    // Use the token to create a Supabase client
    const supabase = supabaseClientUtil(token);
  try {
    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const user_id = formData.get("user_id");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate a unique file name
    const fileName = `${nanoid()}-${file.name}`;
    const bucketName = "videos"; // Replace with your Supabase bucket name

    // Convert file into a buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the file to Supabase Storage
    const { data, error } = await (await supabase).storage
      .from(bucketName)
      .upload(`jiffy_clips/${fileName}`, buffer, {
        contentType: file.type, // Set MIME type
        upsert: false, // Avoid overwriting existing files

      });

    if (error) {
      console.error("Supabase Upload Error:", error);
      return NextResponse.json(
        { error: "Failed to upload video to storage" },
        { status: 500 }
      );
    }

    // Get the public URL of the uploaded video
    const { data: publicUrlData } = (await supabase).storage
      .from(bucketName)
      .getPublicUrl(`jiffy_clips/${fileName}`);

    if (!publicUrlData) {
      return NextResponse.json(
        { error: error || "Failed to retrieve public URL" },
        { status: 500 }
      );
    }

    const videoUrl = publicUrlData.publicUrl;

    // Insert video metadata into the "videos" table
    const { data: videoData, error: dbError } = await (await supabase)
      .from("videos")
      .insert({
        video_url: videoUrl,
        user_id: user_id, // Pass the user ID if needed
        description: formData.get("description") || null,
        likes_count: 0,
        comments_count: 0,
      })
      .select("video_id")
      .single();

    if (dbError) {
      console.error("Database Insert Error:", dbError);
      return NextResponse.json(
        { error: "Failed to save video metadata to database" },
        { status: 500 }
      );
    }

    // Respond with the video ID and URL
    return NextResponse.json({
      message: "Video uploaded successfully",
      videoId: videoData.video_id,
      videoUrl,
    });
  } catch (error) {
    console.error("Error handling video upload:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
