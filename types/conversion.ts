// 파싱 블록 타입 정의

export type BlockType = 'text' | 'inline-math' | 'display-math' | 'image' | 'footnote';
export type Confidence = 'high' | 'medium' | 'low';
export type JobStatus = 'pending' | 'processing' | 'done' | 'error';
export type PageStatus = 'pending' | 'processing' | 'done' | 'error';

export interface BaseBlock {
  type: BlockType;
  bbox?: [number, number, number, number];
  flag?: boolean;
  flag_reason?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface InlineMathBlock extends BaseBlock {
  type: 'inline-math';
  latex: string;
  confidence: Confidence;
  reparsed: boolean;
}

export interface DisplayMathBlock extends BaseBlock {
  type: 'display-math';
  latex: string | null;
  equation_number?: string;
  confidence: Confidence;
  reparsed: boolean;
  fallback_image?: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  storage_path: string;
  caption?: string;
}

export interface FootnoteBlock extends BaseBlock {
  type: 'footnote';
  content: string;
  footnote_number: number;
}

export type ParsedBlock =
  | TextBlock
  | InlineMathBlock
  | DisplayMathBlock
  | ImageBlock
  | FootnoteBlock;

export interface ConvJob {
  id: string;
  original_name: string;
  storage_path: string;
  output_path: string | null;
  total_pages: number;
  target_pages: number[];
  status: JobStatus;
  error_msg: string | null;
  rag_indexed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConvPage {
  id: string;
  job_id: string;
  page_number: number;
  status: PageStatus;
  parsed_blocks: ParsedBlock[] | null;
  raw_blocks: ParsedBlock[] | null;
  reparse_count: number;
  flagged_count: number;
  image_paths: string[];
  bbox_version: string;
  error_msg: string | null;
  processed_at: string | null;
}

export interface SSEEvent {
  type: 'progress' | 'page_done' | 'complete' | 'error';
  page?: number;
  total?: number;
  stage?: 'image' | 'vision' | 'katex' | 'reparse' | 'docx' | 'rag';
  message?: string;
  job?: Partial<ConvJob>;
}
