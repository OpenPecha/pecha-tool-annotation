// Base API response structure
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  q: string;
}

// Text-related types
export enum TextStatus {
  DRAFT = "draft",
  INITIALIZED = "initialized",
  ANNOTATION_IN_PROGRESS = "progress",
  ANNOTATED = "annotated",
  REVIEWED = "reviewed",
  PUBLISHED = "published",
}

export interface TextBase {
  title: string;
  content: string;
  source?: string;
  language: string;
}

export type TextCreate = TextBase;

export interface TextUpdate {
  title?: string;
  content?: string;
  source?: string;
  language?: string;
  status?: TextStatus;
  reviewer_id?: number;
}

export interface TextResponse extends TextBase {
  id: number;
  status: TextStatus;
  reviewer_id?: number;
  created_at: string;
  updated_at?: string;
  annotations_count?: number;
}

export interface TextFilters extends PaginationParams {
  status?: TextStatus;
  language?: string;
  reviewer_id?: number;
  [key: string]: string | number | boolean | undefined;
}

// Annotation-related types
export interface AnnotationBase {
  annotation_type: string;
  start_position: number;
  end_position: number;
  selected_text?: string;
  label?: string;
  name?: string; // Custom name for the annotation (especially for headers)
  meta?: Record<string, unknown>;
  confidence: number;
}

export interface AnnotationCreate extends AnnotationBase {
  text_id: number;
}

export interface AnnotationUpdate {
  annotation_type?: string;
  start_position?: number;
  end_position?: number;
  selected_text?: string;
  label?: string;
  name?: string; // Custom name for the annotation
  meta?: Record<string, unknown>;
  confidence?: number;
}

export interface AnnotationResponse extends AnnotationBase {
  id: number;
  text_id: number;
  annotator_id: number;
  created_at: string;
  updated_at?: string;
}

export interface AnnotationFilters extends PaginationParams {
  text_id?: number;
  annotator_id?: number;
  annotation_type?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AnnotationStats {
  total_annotations: number;
  annotations_by_type: Record<string, number>;
  annotations_by_user: Record<string, number>;
}

export interface ValidatePositionsRequest {
  text_id: number;
  start_position: number;
  end_position: number;
}

export interface ValidatePositionsResponse {
  valid: boolean;
  error?: string;
  selected_text?: string;
}

// User-related types
export enum UserRole {
  VIEWER = "viewer",
  ANNOTATOR = "annotator",
  REVIEWER = "reviewer",
  ADMIN = "admin",
}

export interface UserBase {
  username: string;
  email: string;
  full_name?: string;
}

export interface UserCreate extends UserBase {
  role: UserRole;
  is_active: boolean;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserResponse extends UserBase {
  id: number;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserFilters extends PaginationParams {
  is_active?: boolean;
  role?: UserRole;
}

// Combined types
export interface TextWithAnnotations extends TextResponse {
  annotations: AnnotationResponse[];
}

// API Error types
export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface ValidationError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}

// Stats types
export interface TextStats {
  total_texts: number;
  texts_by_status: Record<TextStatus, number>;
  texts_by_language: Record<string, number>;
}
