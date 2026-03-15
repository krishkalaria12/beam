export interface FileEntry {
  path: string;
  name: string;
  size: number;
  modified: number;
}

export interface SearchResult {
  entry: FileEntry;
  score: number;
}

export interface PaginatedSearchMetadata {
  total_results: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface PaginatedSearchResponse {
  results: SearchResult[];
  metadata: PaginatedSearchMetadata;
}

export interface SearchRequest {
  query: string;
  page?: number;
  per_page?: number;
}
