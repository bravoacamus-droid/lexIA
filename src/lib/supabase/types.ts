export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type NormativeDocType =
  | 'ley'
  | 'reglamento'
  | 'directiva'
  | 'opinion'
  | 'pronunciamiento'
  | 'resolucion_tce';

export interface Profile {
  id: string;
  full_name: string | null;
  organization: string | null;
  role: 'user' | 'admin';
  avatar_url: string | null;
  created_at: string;
}

export interface NormativeDocument {
  id: string;
  type: NormativeDocType;
  number: string | null;
  date: string | null;
  title: string;
  summary: string | null;
  source_url: string | null;
  pdf_storage_path: string | null;
  raw_text: string | null;
  metadata: Json;
  ingested_at: string;
}

export interface NormativeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[] | null;
  metadata: Json;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSource {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
  created_at: string;
}

export interface UserFolder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface UserSavedDocument {
  id: string;
  user_id: string;
  document_id: string;
  folder_id: string | null;
  saved_at: string;
}

export interface UserAnnotation {
  id: string;
  user_id: string;
  document_id: string;
  highlighted_text: string;
  position: { start_offset: number; end_offset: number };
  color: 'yellow' | 'green' | 'blue';
  created_at: string;
}

export interface EvaluationItem {
  requisito: string;
  postores: Array<{
    nombre: string;
    status: 'cumple' | 'subsanable' | 'no_cumple';
    detalle: string;
    sustento_normativo?: Array<{
      norma: string;
      articulo?: string;
      doc_id?: string;
    }>;
  }>;
}

export interface EvaluationResult {
  resumen_ejecutivo: string;
  items: EvaluationItem[];
  conclusiones: string;
  postores: string[];
}

export interface Evaluation {
  id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  bases_file_path: string | null;
  offer_files: Array<{ name: string; path: string }> | null;
  result: EvaluationResult | null;
  created_at: string;
  completed_at: string | null;
}

export interface GeneratedDocument {
  id: string;
  user_id: string;
  document_type: string;
  title: string;
  input_data: Record<string, unknown>;
  generated_content: string | null;
  status: 'draft' | 'final';
  created_at: string;
}

type TableDef<R> = {
  Row: R;
  Insert: Partial<R> & Record<string, unknown>;
  Update: Partial<R> & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      normative_documents: TableDef<NormativeDocument>;
      normative_chunks: TableDef<NormativeChunk>;
      chat_conversations: TableDef<ChatConversation>;
      chat_messages: TableDef<ChatMessage>;
      user_folders: TableDef<UserFolder>;
      user_saved_documents: TableDef<UserSavedDocument>;
      user_annotations: TableDef<UserAnnotation>;
      evaluations: TableDef<Evaluation>;
      generated_documents: TableDef<GeneratedDocument>;
    };
    Views: Record<string, never>;
    Functions: {
      hybrid_search: {
        Args: {
          query_text: string;
          query_embedding: number[];
          match_count?: number;
          filter_type?: string | null;
        };
        Returns: Array<{
          chunk_id: string;
          document_id: string;
          content: string;
          doc_title: string;
          doc_type: NormativeDocType;
          doc_number: string | null;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
