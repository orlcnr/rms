import { PaginatedMeta } from '../shared/types';

export interface AdminRestaurantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  description?: string;
  address?: string;
  contact_phone?: string;
  google_comment_url?: string;
  owner?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  contact_email?: string;
}

export interface RestaurantsResponse {
  data: AdminRestaurantRow[];
  meta: PaginatedMeta;
}

export interface RestaurantFormValues {
  name: string;
  slug: string;
  description?: string;
  address: string;
  contact_email: string;
  contact_phone?: string;
  owner_email: string;
  owner_first_name: string;
  owner_last_name: string;
  google_comment_url?: string;
}
