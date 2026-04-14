"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clockAction } from "@/lib/actions/attendance";
import { toast } from "sonner";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { SELFIE_MAX_SIZE_KB, SELFIE_QUALITY } from "@/lib/constants";

type ClockButtonProps = {
  isClockedIn: boolean;
  companyId: string;
  profileId: string;
};

export function ClockButton({ isClockedIn, companyId, profileId }: ClockButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClock() {
    setIsLoading(true);
    try {
      // Capture selfie
      let selfieUrl: string | null = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);

        stream.getTracks().forEach((t) => t.stop());

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", SELFIE_QUALITY)
        );

        // Compress
        const compressed = await imageCompression(
          new File([blob], "selfie.jpg", { type: "image/jpeg" }),
          { maxSizeMB: SELFIE_MAX_SIZE_KB / 1024, useWebWorker: true }
        );

        // Upload to Supabase Storage
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];
        const path = `${companyId}/attendance/${profileId}/${today}/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("vizportal-storage")
          .upload(path, compressed);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("vizportal-storage")
            .getPublicUrl(path);
          selfieUrl = urlData.publicUrl;
        }
      } catch {
        // Camera/upload failed — proceed without selfie
        console.warn("Selfie capture failed, proceeding without");
      }

      // Get GPS
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS failed — proceed without
      }

      const type = isClockedIn ? "clock_out" : "clock_in";
      const result = await clockAction({ type, selfieUrl, latitude, longitude });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isClockedIn ? "Clocked out" : "Clocked in");
      }
    } catch {
      toast.error("Failed to clock");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClock}
      disabled={isLoading}
      size="lg"
      className="h-20 w-full text-lg"
      variant={isClockedIn ? "destructive" : "default"}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      ) : isClockedIn ? (
        <LogOut className="mr-2 h-6 w-6" />
      ) : (
        <LogIn className="mr-2 h-6 w-6" />
      )}
      {isLoading ? "Processing..." : isClockedIn ? "Clock Out" : "Clock In"}
    </Button>
  );
}
