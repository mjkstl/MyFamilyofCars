export type ParentLinkConfidence = 'high' | 'low' | 'manual';
export type PhotoQualityStatus = 'pending' | 'approved' | 'flagged';
export type FactType = 'trivia' | 'history' | 'spec';
export type ShareType = 'invite' | 'poster';
export type CollectionVisibility = 'private' | 'family';

export interface Collection {
  id: string;
  family_id: string;
  type: string;
  name: string;
  visibility: CollectionVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  collection_id: string;
  title: string;
  story: string | null;
  tags: string[];
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemPerson {
  item_id: string;
  member_id: string;
  relationship: string | null;
  created_at: string;
}

export interface ItemPhoto {
  id: string;
  item_id: string;
  url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface Member {
  id: string;
  family_id: string;
  display_name: string;
  relationship: string | null;
  avatar_url: string | null;
  user_id: string | null;
  parent_member_id: string | null;
  parent_link_confidence: ParentLinkConfidence | null;
  parent_link_confirmed: boolean;
  created_at: string;
}

export type CarStatus = 'first' | 'current' | 'memory' | 'dream';
export type OwnershipDuration = 'under_2_years' | 'under_5_years' | 'five_plus_years';

export interface Car {
  id: string;
  member_id: string;
  collection_id: string | null;
  item_id: string | null;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  ownership_duration: OwnershipDuration | null;
  color: string | null;
  nickname: string | null;
  memories: string | null;
  fun_fact: string | null;
  status: CarStatus;
  photo_url: string | null;
  photo_quality_status: PhotoQualityStatus;
  purchase_date: string | null;
  sold_date: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CarFact {
  id: string;
  make: string;
  model: string;
  year: number;
  fact_text: string;
  fact_type: FactType;
  source_confidence: 'high' | 'medium' | 'low' | null;
  created_at: string;
}

export interface FamilyShare {
  id: string;
  family_id: string;
  share_type: ShareType;
  created_at: string;
}

// Insert helper types (fields the DB fills in via defaults are optional)
export type MemberInsert = Pick<Member, 'family_id' | 'display_name'> &
  Partial<
    Pick<
      Member,
      | 'relationship'
      | 'avatar_url'
      | 'user_id'
      | 'parent_member_id'
      | 'parent_link_confidence'
      | 'parent_link_confirmed'
    >
  >;

export type CarInsert = Pick<Car, 'member_id' | 'make' | 'model' | 'year'> &
  Partial<
    Pick<
      Car,
      | 'trim'
      | 'color'
      | 'nickname'
      | 'memories'
      | 'fun_fact'
      | 'status'
      | 'ownership_duration'
      | 'photo_url'
      | 'photo_quality_status'
      | 'purchase_date'
      | 'sold_date'
      | 'order_index'
      | 'collection_id'
      | 'item_id'
    >
  >;
