// Supabase DB 타입 (수동 정의 — 자동 생성 대체)

export type Database = {
  public: {
    Tables: {
      conv_jobs: {
        Row: {
          id: string;
          original_name: string;
          storage_path: string;
          output_path: string | null;
          total_pages: number;
          target_pages: number[] | null;
          status: 'pending' | 'processing' | 'done' | 'error';
          error_msg: string | null;
          rag_indexed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          original_name: string;
          storage_path: string;
          output_path?: string | null;
          total_pages?: number;
          target_pages?: number[] | null;
          status?: 'pending' | 'processing' | 'done' | 'error';
          error_msg?: string | null;
          rag_indexed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          original_name?: string;
          storage_path?: string;
          output_path?: string | null;
          total_pages?: number;
          target_pages?: number[] | null;
          status?: 'pending' | 'processing' | 'done' | 'error';
          error_msg?: string | null;
          rag_indexed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conv_pages: {
        Row: {
          id: string;
          job_id: string;
          page_number: number;
          status: 'pending' | 'processing' | 'done' | 'error';
          parsed_blocks: unknown | null;
          raw_blocks: unknown | null;
          reparse_count: number;
          flagged_count: number;
          image_paths: string[];
          bbox_version: string | null;
          error_msg: string | null;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          page_number: number;
          status?: 'pending' | 'processing' | 'done' | 'error';
          parsed_blocks?: unknown | null;
          raw_blocks?: unknown | null;
          reparse_count?: number;
          flagged_count?: number;
          image_paths?: string[];
          bbox_version?: string | null;
          error_msg?: string | null;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          page_number?: number;
          status?: 'pending' | 'processing' | 'done' | 'error';
          parsed_blocks?: unknown | null;
          raw_blocks?: unknown | null;
          reparse_count?: number;
          flagged_count?: number;
          image_paths?: string[];
          bbox_version?: string | null;
          error_msg?: string | null;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conv_pages_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'conv_jobs';
            referencedColumns: ['id'];
          }
        ];
      };
      book_chunks: {
        Row: {
          id: string;
          job_id: string;
          page_number: number;
          chunk_index: number;
          chunk_type: 'text' | 'formula' | 'example' | 'mixed';
          content: string;
          latex_items: string[];
          embedding: number[] | null;
          source_title: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          page_number: number;
          chunk_index: number;
          chunk_type: 'text' | 'formula' | 'example' | 'mixed';
          content: string;
          latex_items?: string[];
          embedding?: number[] | null;
          source_title: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          page_number?: number;
          chunk_index?: number;
          chunk_type?: 'text' | 'formula' | 'example' | 'mixed';
          content?: string;
          latex_items?: string[];
          embedding?: number[] | null;
          source_title?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'book_chunks_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'conv_jobs';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_book_chunks: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          id: string;
          job_id: string;
          page_number: number;
          chunk_index: number;
          chunk_type: string;
          content: string;
          latex_items: string[];
          source_title: string;
          metadata: Record<string, unknown>;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
