import { prisma } from "./prisma";

export async function ensureUser({
  id,
  username,
  imageUrl,
}: {
  id: string;
  username?: string | null;
  imageUrl?: string | null;
}) {
  return prisma.user.upsert({
    where: { id },
    update: {
      ...(username ? { username } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    },
    create: {
      id,
      username: username ?? null,
      imageUrl: imageUrl ?? null,
    },
  });
}
