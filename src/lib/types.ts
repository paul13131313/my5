export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: number;
  user_id: string;
  slot: number;
  category: string;
  title: string;
  note: string;
  created_at: string;
  updated_at: string;
}
