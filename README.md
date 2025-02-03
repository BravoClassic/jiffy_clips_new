<p align="center">
  <a href="https://go.clerk.com/e3UDpP4" target="_blank" rel="noopener noreferrer">
   <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./public/light-logo.png">
      <img src="./public/dark-logo.png" height="64">
    </picture>
  </a>
  <br />
</p>
<div align="center">
  <h1>
    Next.js Clerk auth starter template
  </h1>
  <a href="https://www.npmjs.com/package/@clerk/clerk-js">
    <img alt="" src="https://img.shields.io/npm/dm/@clerk/clerk-js" />
  </a>
  <a href="https://discord.com/invite/b5rXHjAg7A">
    <img alt="Discord" src="https://img.shields.io/discord/856971667393609759?color=7389D8&label&logo=discord&logoColor=ffffff" />
  </a>
  <a href="https://twitter.com/clerkdev">
    <img alt="Twitter" src="https://img.shields.io/twitter/url.svg?label=%40clerkdev&style=social&url=https%3A%2F%2Ftwitter.com%2Fclerkdev" />
  </a>
  <br />
  <br />
  <img alt="Clerk Hero Image" src="public/og.png">
</div>

## Introduction

Clerk is a developer-first authentication and user management solution. It provides pre-built React components and hooks for sign-in, sign-up, user profile, and organization management. Clerk is designed to be easy to use and customize, and can be dropped into any React or Next.js application.

This template allows you to get started with Clerk and Next.js (App Router) in a matter of minutes, and demonstrates features of Clerk such as:

- Fully functional auth flow with sign-in, sign-up, and a protected page
- Customized Clerk components with Tailwind CSS
- Hooks for accessing user data and authentication state
- Organizations for multi-tenant applications

## Demo

A hosted demo of this example is available at https://clerk-nextjs-app-router.vercel.app/

## Deploy

Easily deploy the template to Vercel with the button below. You will need to set the required environment variables in the Vercel dashboard.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fclerk%2Fnextjs-auth-starter-template&env=CLERK_SECRET_KEY,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY&envDescription=Your%20Clerk%20application%20keys%2C%20accessible%20from%20dashboard.clerk.com.&envLink=https%3A%2F%2Fgithub.com%2Fclerk%2Fnextjs-auth-starter-template%3Ftab%3Dreadme-ov-file%23running-the-template&demo-url=https%3A%2F%2Fnextjs-auth-starter-template-kit.vercel.app%2F)

## Running the template

```bash
git clone https://github.com/clerk/clerk-nextjs-demo-app-router
```

To run the example locally, you need to:

1. Sign up for a Clerk account at [https://clerk.com](https://go.clerk.com/31bREJU).
2. Go to the [Clerk dashboard](https://go.clerk.com/4I5LXFj) and create an application.
3. Set the required Clerk environment variables as shown in [the example `env` file](./.env.example).
4. Go to "Organization Settings" in your sidebar and enable Organizations
5. `npm install` the required dependencies.
6. `npm run dev` to launch the development server.

## Learn more

To learn more about Clerk and Next.js, check out the following resources:

- [Quickstart: Get started with Next.js and Clerk](https://go.clerk.com/vgWhQ7B)
- [Clerk Documentation](https://go.clerk.com/aNiTioa)
- [Next.js Documentation](https://nextjs.org/docs)

## Found an issue or have feedback?

If you have found an issue with this repo or have feedback, please join our Discord and create a new thread inside of our [support](https://clerk.com/discord) channel.

If it's a quick fix, such as a misspelled word or a broken link, feel free to skip creating a thread.
Go ahead and create a [pull request](https://github.com/clerk/clerk-nextjs-demo-app-router/pulls) with the solution. :rocket:

## Connect with us

You can discuss ideas, ask questions, and meet others from the community in our [Discord](https://clerk.com/discord).

If you prefer, you can also find support through our [Twitter](https://twitter.com/ClerkDev), or you can [email](mailto:support@clerk.dev) us!



// const videos = [
//   {
//     id: 1,
//     username: "user1",
//     description: "Check out this cool video!",
//     likes: 1000,
//     comments: 50,
//     shares: 20,
//     url: "https://tovaadvdtovtmmfmoxor.supabase.co/storage/v1/object/sign/videos/jiffy_clips/YouTube%20Shorts%20HD%20(1).mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ2aWRlb3MvamlmZnlfY2xpcHMvWW91VHViZSBTaG9ydHMgSEQgKDEpLm1wNCIsImlhdCI6MTczNzQ2NzA0MCwiZXhwIjozMTU1MzA1OTMxMDQwfQ.TncnoxRHTN5vsmxvErH3RvvMhgx3__PBv0dwnM2GaZ0&t=2025-01-21T13%3A44%3A00.742Z",
//   },
//   {
//     id: 2,
//     username: "user2",
//     description: "Another awesome clip!",
//     likes: 500,
//     comments: 30,
//     shares: 10,
//     url: "https://tovaadvdtovtmmfmoxor.supabase.co/storage/v1/object/sign/videos/jiffy_clips/YouTube%20Shorts%20HD%20(2).mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ2aWRlb3MvamlmZnlfY2xpcHMvWW91VHViZSBTaG9ydHMgSEQgKDIpLm1wNCIsImlhdCI6MTczNzQ2NzAyMSwiZXhwIjozMTU1MzA1OTMxMDIxfQ.NfkoGxaJ9WmiYvTWLokPbcLm3TsAb2cLqSt8FK3WcZU&t=2025-01-21T13%3A43%3A41.542Z",
//   },
//   {
//     id: 3,
//     username: "user3",
//     description: "This is amazing!",
//     likes: 750,
//     comments: 40,
//     shares: 15,
//     url: "https://tovaadvdtovtmmfmoxor.supabase.co/storage/v1/object/sign/videos/jiffy_clips/YouTube%20Shorts%20HD%20(3).mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ2aWRlb3MvamlmZnlfY2xpcHMvWW91VHViZSBTaG9ydHMgSEQgKDMpLm1wNCIsImlhdCI6MTczNzQ2Njk5MCwiZXhwIjozMTU1MzA1OTMwOTkwfQ.UP6SR1H8cw2XJMAp4XMbaqf8I_jJTlL2BrE9bLSf3l8&t=2025-01-21T13%3A43%3A09.987Z",
//   },
//   {
//     id: 4,
//     username: "user4",
//     description: "You won't believe what happens next!",
//     likes: 1200,
//     comments: 60,
//     shares: 25,
//     url: "https://tovaadvdtovtmmfmoxor.supabase.co/storage/v1/object/sign/videos/jiffy_clips/YouTube%20Shorts%20HD.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ2aWRlb3MvamlmZnlfY2xpcHMvWW91VHViZSBTaG9ydHMgSEQubXA0IiwiaWF0IjoxNzM3NDY0NjYyLCJleHAiOjMxNTUzMDU5Mjg2NjJ9.VS2rLzWQP0X-OyKfzjtUOWMmDtXB3DTlE0gvL-Ljy-8&t=2025-01-21T13%3A04%3A22.759Z",
//   },
// ];