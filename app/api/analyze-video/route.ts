import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("API_KEY is not defined in the environment variables.");
}

const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);
async function waitForFileToBeActive(
  fileId: string,
  maxRetries = 10,
  delay = 2000
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const fileStatus = await fileManager.getFile(fileId) as any;
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
    // Parse the form data
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

    // Use Google Generative AI to generate the description
    await waitForFileToBeActive(uploadResponse.file.name);

    // Use Google Generative AI to generate the description
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      {
        text: "Generate a concise, engaging description for this video that highlights its main content and purpose. MAKE THIS ONE PARAGRAPH",
      },
    ]);

    // Return the generated content
    const generatedDescription = result.response.text();
    const formattedDescription = generatedDescription.split(":")[1].trim()
    return NextResponse.json(
      { description: formattedDescription },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error during video description generation:", error);
      return NextResponse.json(
        { error: "Failed to generate description", details: error.message },
        { status: 500 }
      );
    } else {
      console.error("Error during video description generation:", error);
      return NextResponse.json(
        { error: "Failed to generate description", details: "Unknown error" },
        { status: 500 }
      );
    }
  }
}
