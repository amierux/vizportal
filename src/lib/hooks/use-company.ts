"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Company, Profile } from "@/types";

type CompanyState = {
  company: Company | null;
  isLoading: boolean;
};

export function useCompany() {
  const [state, setState] = useState<CompanyState>({
    company: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function loadCompany() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ company: null, isLoading: false });
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const profile = profileData as Profile | null;

      if (!profile) {
        setState({ company: null, isLoading: false });
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      setState({ company, isLoading: false });
    }

    loadCompany();
  }, []);

  return state;
}
