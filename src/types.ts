export interface Offer {
  id: string;
  image0: string;
  name: string;
  pay: boolean;
  partner_id: string;
  partner_name: string;
  date_start: string;
  date_end: string;
  date_code_start: string;
  date_code_end: string;
  with_code: string;
  url: string;
  visual_type: string;
  used_code_count: number;
  discount_value: number | null;
  discount_percentage: number | null;
  original_price: number | null;
  partner_locations: string[];
  partner_category_name: string;
  discount_description: string;
  label_color: string | null;
  label_text: string | null;
  recommended: number;
  is_advantage: number;
  coming_soon: number;
  code?: string;
}

export interface Session {
  gtmUserId: string;
  avatarUrl: string;
}

export interface Meta {
  total: number;
  count: number;
}

export interface Metadata {
  trace: string;
  duration: string;
}

export interface OffersResponse {
  statusCode: number;
  data: Offer[];
  session: Session | null;
  meta: Meta;
  metadata: Metadata;
}

