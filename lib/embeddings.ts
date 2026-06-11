import type { FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";

const globalForEmbeddings = globalThis as unknown as {
  embeddingPipeline: Promise<FeatureExtractionPipeline> | undefined;
};

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!globalForEmbeddings.embeddingPipeline) {
    globalForEmbeddings.embeddingPipeline = import(
      "@huggingface/transformers"
    ).then(({ pipeline }) => pipeline("feature-extraction", MODEL));
  }
  return globalForEmbeddings.embeddingPipeline;
}

export async function embedText(text: string): Promise<Float32Array> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return new Float32Array(output.data as Float32Array);
}

export function embeddingToBuffer(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
}

export function bufferToEmbedding(buffer: Buffer | Uint8Array): Float32Array {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
}

// Vectors are normalized at embed time, so cosine similarity is a dot product.
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function buildVideoText({
  description,
  tags,
  categories,
}: {
  description: string | null;
  tags: string[];
  categories: string[];
}): string {
  return [description ?? "", tags.join(", "), categories.join(", ")]
    .filter(Boolean)
    .join("\n");
}
