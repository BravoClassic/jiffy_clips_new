import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";



// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are not set.");
}
if(!apiKey){
    throw new Error("GOOGLE_API_KEY is not defined in the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);
async function waitForFileToBeActive(
  fileId: string,
  maxRetries = 10,
  delay = 2000
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const fileStatus = (await fileManager.getFile(fileId)) as any;
    if (fileStatus && fileStatus.state === "ACTIVE") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(
    `File ${fileId} is not in an ACTIVE state after ${maxRetries} retries.`
  );
}
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Save the video to a temporary location
    const tempDir = path.join("/tmp", videoFile.name);
    const fileStream = fs.createWriteStream(tempDir);
    const readableStream = Readable.from(
      Buffer.from(await videoFile.arrayBuffer())
    );
    readableStream.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // Upload the video file to Google File Manager
    const uploadResponse = await fileManager.uploadFile(tempDir, {
      mimeType: videoFile.type,
      displayName: videoFile.name,
    });

    // Clean up the temporary file
    fs.unlinkSync(tempDir);

    // Use Google Generative AI to generate the summary and quiz
    await waitForFileToBeActive(uploadResponse.file.name);

    // Step 2: Use Gemini to generate tags and categories
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
      Analyze the content of this video and generate the following structured output:
1. A list of **tags** that describe specific elements of the video. Each tag should be unique and concise.
2. A list of **categories** that broadly classify the video. Each category should belong to one of the following: [Entertainment, Education, Fitness, Food, Travel, Lifestyle, Nature, Technology, Sports, Events].

Return the output in the following JSON format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "categories": ["category1", "category2"]
}

    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      { text: prompt },
    ]);

    const responseText = result.response.text();
    console.log("Gemini Response:", responseText);

    // Step 3: Parse Tags and Categories (assuming a simple format from Gemini)
    // Parse the responseText into tags and categories

    const regex = /```json([\s\S]*?)```/;
    const match = responseText.match(regex);
    
    if (!match || !match[1]) {
      throw new Error("Failed to extract JSON from Gemini response.");
    }

    const { tags, categories } = JSON.parse(match[1].trim());

   
   

    // // Step 4: Save Tags and Categories to Supabase
   

    // Insert Tags
    for (const tag of tags) {
      const { data: tagData } = await supabase
        .from("tags")
        .upsert({ tag_name: tag }, { onConflict: "tag_name" })
        .select("tag_id")
        .single();

      // if (tagData) {
      //   await supabase.from("video_tags").insert({
      //     video_id: videoId,
      //     tag_id: tagData.tag_id,
      //   });
      // }
    }

    // // Insert Categories
    for (const category of categories) {
      const { data: categoryData } = await supabase
        .from("categories")
        .upsert({ category_name: category }, { onConflict: "category_name" })
        .select("category_id")
        .single();

      // if (categoryData) {
      //   await supabase.from("video_categories").insert({
      //     video_id: videoId,
      //     category_id: categoryData.category_id,
      //   });
      // }
    }

    return NextResponse.json({
      tags,
      categories
    });
  } catch (error) {
    console.error("Error generating tags and categories:", error);
    return NextResponse.json(
      {
        error: "Failed to generate tags and categories",
        details: (error instanceof Error) ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
