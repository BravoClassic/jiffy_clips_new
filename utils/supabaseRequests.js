import { supabaseClient, SupabaseClient } from "./supabaseClient";

export const uploadVideos = async({userId, token})=>{
    const supabase = await supabaseClient(token);
    const {data: vidoes} = await supabase.from("videos").insert()
}