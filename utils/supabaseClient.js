'use server'
import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";

// Create a single supabase client for interacting with your database
export const supabaseClientUtil = async(token)=>{ 

  // The `useSession()` hook will be used to get the Clerk session object

  // Create a custom supabase client that injects the Clerk Supabase token into the request headers
  function createClerkSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_KEY,
      // {
      //   global: {
      //     // Get the custom Supabase token from Clerk
      //     fetch: async (url, options = {}) => {
      //       // Insert the Clerk Supabase token into the headers
      //       const headers = new Headers(options?.headers)
      //       headers.set('Authorization', `Bearer ${token}`)

      //       // Now call the default fetch
      //       return fetch(url, {
      //         ...options,
      //         headers,
      //       })
      //     },
      //   },
      // },
    )
  }

    return createClerkSupabaseClient()
    }
