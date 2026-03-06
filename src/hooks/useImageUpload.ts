import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { withNetworkRetry, getNetworkErrorMessage } from "@/lib/network-retry";

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File, bucket: string = "product-images"): Promise<string | null> => {
    setIsUploading(true);
    
    try {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, WebP, or GIF image.", variant: "destructive" });
        return null;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      return await withNetworkRetry(async () => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        return urlData.publicUrl;
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: getNetworkErrorMessage(error, "uploading image"), variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (url: string, bucket: string = "product-images"): Promise<boolean> => {
    try {
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      await withNetworkRetry(async () => {
        const { error } = await supabase.storage.from(bucket).remove([fileName]);
        if (error) throw error;
      });
      return true;
    } catch (error: any) {
      console.error("Delete error:", error);
      return false;
    }
  };

  return { uploadImage, deleteImage, isUploading };
};
