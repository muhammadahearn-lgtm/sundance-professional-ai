export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          application_date: string
          application_id: string
          application_status: Database["public"]["Enums"]["application_status"]
          candidate_id: string
          created_at: string
          job_id: string
          updated_at: string
        }
        Insert: {
          application_date?: string
          application_id?: string
          application_status?: Database["public"]["Enums"]["application_status"]
          candidate_id: string
          created_at?: string
          job_id: string
          updated_at?: string
        }
        Update: {
          application_date?: string
          application_id?: string
          application_status?: Database["public"]["Enums"]["application_status"]
          candidate_id?: string
          created_at?: string
          job_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      candidate_comparisons: {
        Row: {
          candidate_id: string
          comparison_date: string
          comparison_id: string
          recruiter_id: string
        }
        Insert: {
          candidate_id: string
          comparison_date?: string
          comparison_id?: string
          recruiter_id: string
        }
        Update: {
          candidate_id?: string
          comparison_date?: string
          comparison_id?: string
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_comparisons_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "candidate_comparisons_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      candidate_languages: {
        Row: {
          candidate_id: string
          created_at: string
          lookup_id: string
          proficiency_level: Database["public"]["Enums"]["proficiency_level"]
          years_experience: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          lookup_id: string
          proficiency_level?: Database["public"]["Enums"]["proficiency_level"]
          years_experience?: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          lookup_id?: string
          proficiency_level?: Database["public"]["Enums"]["proficiency_level"]
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_languages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "candidate_languages_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "programming_languages"
            referencedColumns: ["language_id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          availability: string
          created_at: string
          current_employer: string
          headline: string
          hide_from_current_employer: boolean
          industry_experience: string[]
          job_title: string
          location: string
          locations_of_interest: string[]
          programming_languages: string[]
          resume_file_name: string | null
          resume_path: string | null
          resume_uploaded_at: string | null
          role_id: string | null
          salary_expectation: string
          summary: string
          target_industries: string[]
          target_roles: string[]
          technical_skills: string[]
          tools: string[]
          updated_at: string
          user_id: string
          visibility_status: Database["public"]["Enums"]["visibility_status"]
          work_arrangement: string
          years_experience: number
        }
        Insert: {
          availability?: string
          created_at?: string
          current_employer?: string
          headline?: string
          hide_from_current_employer?: boolean
          industry_experience?: string[]
          job_title?: string
          location?: string
          locations_of_interest?: string[]
          programming_languages?: string[]
          resume_file_name?: string | null
          resume_path?: string | null
          resume_uploaded_at?: string | null
          role_id?: string | null
          salary_expectation?: string
          summary?: string
          target_industries?: string[]
          target_roles?: string[]
          technical_skills?: string[]
          tools?: string[]
          updated_at?: string
          user_id: string
          visibility_status?: Database["public"]["Enums"]["visibility_status"]
          work_arrangement?: string
          years_experience?: number
        }
        Update: {
          availability?: string
          created_at?: string
          current_employer?: string
          headline?: string
          hide_from_current_employer?: boolean
          industry_experience?: string[]
          job_title?: string
          location?: string
          locations_of_interest?: string[]
          programming_languages?: string[]
          resume_file_name?: string | null
          resume_path?: string | null
          resume_uploaded_at?: string | null
          role_id?: string | null
          salary_expectation?: string
          summary?: string
          target_industries?: string[]
          target_roles?: string[]
          technical_skills?: string[]
          tools?: string[]
          updated_at?: string
          user_id?: string
          visibility_status?: Database["public"]["Enums"]["visibility_status"]
          work_arrangement?: string
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          candidate_id: string
          created_at: string
          lookup_id: string
          proficiency_level: Database["public"]["Enums"]["proficiency_level"]
          years_experience: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          lookup_id: string
          proficiency_level?: Database["public"]["Enums"]["proficiency_level"]
          years_experience?: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          lookup_id?: string
          proficiency_level?: Database["public"]["Enums"]["proficiency_level"]
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "candidate_skills_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "technical_skills"
            referencedColumns: ["skill_id"]
          },
        ]
      }
      candidate_technologies: {
        Row: {
          candidate_id: string
          created_at: string
          lookup_id: string
          proficiency_level: Database["public"]["Enums"]["proficiency_level"]
          years_experience: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          lookup_id: string
          proficiency_level?: Database["public"]["Enums"]["proficiency_level"]
          years_experience?: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          lookup_id?: string
          proficiency_level?: Database["public"]["Enums"]["proficiency_level"]
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_technologies_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "candidate_technologies_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["technology_id"]
          },
        ]
      }
      certifications: {
        Row: {
          candidate_id: string
          certification_id: string
          certification_name: string
          certification_number: string
          created_at: string
          expiration_date: string | null
          issue_date: string | null
          issuing_organization: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          certification_id?: string
          certification_name: string
          certification_number?: string
          created_at?: string
          expiration_date?: string | null
          issue_date?: string | null
          issuing_organization?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          certification_id?: string
          certification_name?: string
          certification_number?: string
          created_at?: string
          expiration_date?: string | null
          issue_date?: string | null
          issuing_organization?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      companies: {
        Row: {
          banner_url: string | null
          company_id: string
          company_name: string
          company_size: string
          contact_email: string
          created_at: string
          created_by: string
          description: string
          gallery_urls: string[]
          headquarters: string
          hiring_regions: string[]
          hiring_volume: string
          industry: string
          logo_url: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          preferred_work_arrangements: string[]
          primary_technical_roles: string[]
          updated_at: string
          website: string
          why_work_here: string
        }
        Insert: {
          banner_url?: string | null
          company_id?: string
          company_name: string
          company_size?: string
          contact_email?: string
          created_at?: string
          created_by?: string
          description?: string
          gallery_urls?: string[]
          headquarters?: string
          hiring_regions?: string[]
          hiring_volume?: string
          industry?: string
          logo_url?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          preferred_work_arrangements?: string[]
          primary_technical_roles?: string[]
          updated_at?: string
          website?: string
          why_work_here?: string
        }
        Update: {
          banner_url?: string | null
          company_id?: string
          company_name?: string
          company_size?: string
          contact_email?: string
          created_at?: string
          created_by?: string
          description?: string
          gallery_urls?: string[]
          headquarters?: string
          hiring_regions?: string[]
          hiring_volume?: string
          industry?: string
          logo_url?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          preferred_work_arrangements?: string[]
          primary_technical_roles?: string[]
          updated_at?: string
          website?: string
          why_work_here?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          candidate_id: string
          created_at: string
          degree: string
          education_id: string
          field_of_study: string
          graduation_year: number | null
          institution_name: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          degree?: string
          education_id?: string
          field_of_study?: string
          graduation_year?: number | null
          institution_name: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          degree?: string
          education_id?: string
          field_of_study?: string
          graduation_year?: number | null
          institution_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      job_comparisons: {
        Row: {
          candidate_id: string
          comparison_date: string
          comparison_id: string
          job_id: string
        }
        Insert: {
          candidate_id: string
          comparison_date?: string
          comparison_id?: string
          job_id: string
        }
        Update: {
          candidate_id?: string
          comparison_date?: string
          comparison_id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_comparisons_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_comparisons_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_languages: {
        Row: {
          job_id: string
          lookup_id: string
          required_flag: boolean
          requirement_level: string
        }
        Insert: {
          job_id: string
          lookup_id: string
          required_flag?: boolean
          requirement_level?: string
        }
        Update: {
          job_id?: string
          lookup_id?: string
          required_flag?: boolean
          requirement_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_languages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_languages_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "programming_languages"
            referencedColumns: ["language_id"]
          },
        ]
      }
      job_skills: {
        Row: {
          job_id: string
          lookup_id: string
          required_flag: boolean
          requirement_level: string
        }
        Insert: {
          job_id: string
          lookup_id: string
          required_flag?: boolean
          requirement_level?: string
        }
        Update: {
          job_id?: string
          lookup_id?: string
          required_flag?: boolean
          requirement_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_skills_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "technical_skills"
            referencedColumns: ["skill_id"]
          },
        ]
      }
      job_technologies: {
        Row: {
          job_id: string
          lookup_id: string
          required_flag: boolean
          requirement_level: string
        }
        Insert: {
          job_id: string
          lookup_id: string
          required_flag?: boolean
          requirement_level?: string
        }
        Update: {
          job_id?: string
          lookup_id?: string
          required_flag?: boolean
          requirement_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_technologies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_technologies_lookup_id_fkey"
            columns: ["lookup_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["technology_id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits_summary: string
          bonus_info: string
          company_id: string | null
          created_at: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          experience_level: string
          job_description: string
          job_id: string
          job_status: Database["public"]["Enums"]["job_status"]
          job_title: string
          location: string
          maximum_salary: number | null
          minimum_salary: number | null
          minimum_years_experience: number
          published_at: string | null
          recruiter_id: string
          role_id: string | null
          salary_currency: string
          updated_at: string
          work_arrangement: Database["public"]["Enums"]["work_arrangement"]
        }
        Insert: {
          benefits_summary?: string
          bonus_info?: string
          company_id?: string | null
          created_at?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_level?: string
          job_description?: string
          job_id?: string
          job_status?: Database["public"]["Enums"]["job_status"]
          job_title: string
          location?: string
          maximum_salary?: number | null
          minimum_salary?: number | null
          minimum_years_experience?: number
          published_at?: string | null
          recruiter_id: string
          role_id?: string | null
          salary_currency?: string
          updated_at?: string
          work_arrangement?: Database["public"]["Enums"]["work_arrangement"]
        }
        Update: {
          benefits_summary?: string
          bonus_info?: string
          company_id?: string | null
          created_at?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_level?: string
          job_description?: string
          job_id?: string
          job_status?: Database["public"]["Enums"]["job_status"]
          job_title?: string
          location?: string
          maximum_salary?: number | null
          minimum_salary?: number | null
          minimum_years_experience?: number
          published_at?: string | null
          recruiter_id?: string
          role_id?: string | null
          salary_currency?: string
          updated_at?: string
          work_arrangement?: Database["public"]["Enums"]["work_arrangement"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "jobs_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "jobs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      match_scores: {
        Row: {
          calculated_date: string
          candidate_id: string
          career_readiness_score: number
          experience_alignment_score: number
          job_id: string
          match_score_id: string
          overall_match_score: number
          skill_alignment_score: number
          technology_alignment_score: number
        }
        Insert: {
          calculated_date?: string
          candidate_id: string
          career_readiness_score?: number
          experience_alignment_score?: number
          job_id: string
          match_score_id?: string
          overall_match_score?: number
          skill_alignment_score?: number
          technology_alignment_score?: number
        }
        Update: {
          calculated_date?: string
          candidate_id?: string
          career_readiness_score?: number
          experience_alignment_score?: number
          job_id?: string
          match_score_id?: string
          overall_match_score?: number
          skill_alignment_score?: number
          technology_alignment_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          first_name: string
          last_name: string
          onboarding_completed: boolean
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          first_name?: string
          last_name?: string
          onboarding_completed?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          first_name?: string
          last_name?: string
          onboarding_completed?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programming_languages: {
        Row: {
          created_at: string
          language_id: string
          language_name: string
        }
        Insert: {
          created_at?: string
          language_id?: string
          language_name: string
        }
        Update: {
          created_at?: string
          language_id?: string
          language_name?: string
        }
        Relationships: []
      }
      recruiter_profiles: {
        Row: {
          company_description: string
          company_id: string | null
          company_name: string
          company_website: string
          created_at: string
          experience_levels: string[]
          geographic_regions: string[]
          industry: string
          industry_specializations: string[]
          location: string
          notify_applications: boolean
          notify_candidates: boolean
          notify_email: boolean
          notify_pipeline: boolean
          organization_type: string
          preferred_candidate_types: string[]
          preferred_contact_method: string
          professional_summary: string
          recruiter_visibility: string
          roles_recruited: string[]
          secondary_specializations: string[]
          specialization: string
          title: string
          updated_at: string
          user_id: string
          work_arrangements: string[]
          years_experience: number
        }
        Insert: {
          company_description?: string
          company_id?: string | null
          company_name?: string
          company_website?: string
          created_at?: string
          experience_levels?: string[]
          geographic_regions?: string[]
          industry?: string
          industry_specializations?: string[]
          location?: string
          notify_applications?: boolean
          notify_candidates?: boolean
          notify_email?: boolean
          notify_pipeline?: boolean
          organization_type?: string
          preferred_candidate_types?: string[]
          preferred_contact_method?: string
          professional_summary?: string
          recruiter_visibility?: string
          roles_recruited?: string[]
          secondary_specializations?: string[]
          specialization?: string
          title?: string
          updated_at?: string
          user_id: string
          work_arrangements?: string[]
          years_experience?: number
        }
        Update: {
          company_description?: string
          company_id?: string | null
          company_name?: string
          company_website?: string
          created_at?: string
          experience_levels?: string[]
          geographic_regions?: string[]
          industry?: string
          industry_specializations?: string[]
          location?: string
          notify_applications?: boolean
          notify_candidates?: boolean
          notify_email?: boolean
          notify_pipeline?: boolean
          organization_type?: string
          preferred_candidate_types?: string[]
          preferred_contact_method?: string
          professional_summary?: string
          recruiter_visibility?: string
          roles_recruited?: string[]
          secondary_specializations?: string[]
          specialization?: string
          title?: string
          updated_at?: string
          user_id?: string
          work_arrangements?: string[]
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
        ]
      }
      recruiting_pipeline: {
        Row: {
          candidate_id: string
          created_at: string
          current_stage: Database["public"]["Enums"]["pipeline_stage"]
          job_id: string | null
          pipeline_id: string
          recruiter_id: string
          stage_date: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          job_id?: string | null
          pipeline_id?: string
          recruiter_id: string
          stage_date?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          job_id?: string | null
          pipeline_id?: string
          recruiter_id?: string
          stage_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiting_pipeline_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recruiting_pipeline_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "recruiting_pipeline_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          role_id: string
          role_name: string
        }
        Insert: {
          created_at?: string
          role_id?: string
          role_name: string
        }
        Update: {
          created_at?: string
          role_id?: string
          role_name?: string
        }
        Relationships: []
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          recruiter_id: string
          saved_candidate_id: string
          saved_date: string
        }
        Insert: {
          candidate_id: string
          recruiter_id: string
          saved_candidate_id?: string
          saved_date?: string
        }
        Update: {
          candidate_id?: string
          recruiter_id?: string
          saved_candidate_id?: string
          saved_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_candidates_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          candidate_id: string
          job_id: string
          saved_date: string
          saved_job_id: string
        }
        Insert: {
          candidate_id: string
          job_id: string
          saved_date?: string
          saved_job_id?: string
        }
        Update: {
          candidate_id?: string
          job_id?: string
          saved_date?: string
          saved_job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_date: string
          recruiter_id: string
          saved_search_id: string
          search_criteria: Json
          search_name: string
        }
        Insert: {
          created_date?: string
          recruiter_id: string
          saved_search_id?: string
          search_criteria?: Json
          search_name: string
        }
        Update: {
          created_date?: string
          recruiter_id?: string
          saved_search_id?: string
          search_criteria?: Json
          search_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      technical_skills: {
        Row: {
          created_at: string
          skill_id: string
          skill_name: string
        }
        Insert: {
          created_at?: string
          skill_id?: string
          skill_name: string
        }
        Update: {
          created_at?: string
          skill_id?: string
          skill_name?: string
        }
        Relationships: []
      }
      technologies: {
        Row: {
          created_at: string
          technology_category: string
          technology_id: string
          technology_name: string
        }
        Insert: {
          created_at?: string
          technology_category: string
          technology_id?: string
          technology_name: string
        }
        Update: {
          created_at?: string
          technology_category?: string
          technology_id?: string
          technology_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "technologies_technology_category_fkey"
            columns: ["technology_category"]
            isOneToOne: false
            referencedRelation: "technology_categories"
            referencedColumns: ["category_name"]
          },
        ]
      }
      technology_categories: {
        Row: {
          category_name: string
        }
        Insert: {
          category_name: string
        }
        Update: {
          category_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_experience: {
        Row: {
          achievements: string
          candidate_id: string
          company_name: string
          created_at: string
          current_position: boolean
          end_date: string | null
          experience_id: string
          industry: string
          job_title: string
          location: string
          responsibilities: string
          start_date: string | null
          technologies_used: string[]
          updated_at: string
        }
        Insert: {
          achievements?: string
          candidate_id: string
          company_name: string
          created_at?: string
          current_position?: boolean
          end_date?: string | null
          experience_id?: string
          industry?: string
          job_title: string
          location?: string
          responsibilities?: string
          start_date?: string | null
          technologies_used?: string[]
          updated_at?: string
        }
        Update: {
          achievements?: string
          candidate_id?: string
          company_name?: string
          created_at?: string
          current_position?: boolean
          end_date?: string | null
          experience_id?: string
          industry?: string
          job_title?: string
          location?: string
          responsibilities?: string
          start_date?: string | null
          technologies_used?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_experience_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      applied_to_my_job: { Args: { _candidate: string }; Returns: boolean }
      candidate_names: {
        Args: { _ids: string[] }
        Returns: {
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      candidate_visible_to_recruiters: {
        Args: { _candidate: string }
        Returns: boolean
      }
      company_recruiters: {
        Args: { _company: string }
        Returns: {
          first_name: string
          last_name: string
          location: string
          specialization: string
          title: string
          user_id: string
        }[]
      }
      complete_onboarding: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      job_is_active: { Args: { _job: string }; Returns: boolean }
      owns_job: { Args: { _job: string }; Returns: boolean }
      recruiter_can_view_candidate: {
        Args: { _candidate: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "candidate" | "recruiter"
      application_status:
        | "applied"
        | "viewed"
        | "recruiter_contacted"
        | "interviewing"
        | "offer"
        | "hired"
        | "rejected"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "consulting"
        | "internship"
      job_status: "draft" | "active" | "paused" | "closed"
      organization_type:
        | "corporate_employer"
        | "staffing_agency"
        | "executive_search_firm"
        | "consulting_firm"
        | "independent_recruiter"
      pipeline_stage:
        | "saved"
        | "contacted"
        | "interviewing"
        | "shortlisted"
        | "offer"
        | "hired"
        | "rejected"
      proficiency_level: "beginner" | "intermediate" | "advanced" | "expert"
      user_status: "active" | "inactive" | "suspended"
      visibility_status: "public" | "recruiter_searchable" | "private"
      work_arrangement: "remote" | "hybrid" | "on_site"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["candidate", "recruiter"],
      application_status: [
        "applied",
        "viewed",
        "recruiter_contacted",
        "interviewing",
        "offer",
        "hired",
        "rejected",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "consulting",
        "internship",
      ],
      job_status: ["draft", "active", "paused", "closed"],
      organization_type: [
        "corporate_employer",
        "staffing_agency",
        "executive_search_firm",
        "consulting_firm",
        "independent_recruiter",
      ],
      pipeline_stage: [
        "saved",
        "contacted",
        "interviewing",
        "shortlisted",
        "offer",
        "hired",
        "rejected",
      ],
      proficiency_level: ["beginner", "intermediate", "advanced", "expert"],
      user_status: ["active", "inactive", "suspended"],
      visibility_status: ["public", "recruiter_searchable", "private"],
      work_arrangement: ["remote", "hybrid", "on_site"],
    },
  },
} as const
