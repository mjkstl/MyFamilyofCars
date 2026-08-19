export type ParentLinkConfidence = 'high' | 'low' | 'manual';
export type PhotoQualityStatus = 'pending' | 'approved' | 'flagged';
export type FactType = 'trivia' | 'history' | 'spec';
export type ShareType = 'invite' | 'poster';

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

export interface Car {
  id: string;
  member_id: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  color: string | null;
  nickname: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_quality_status: PhotoQualityStatus;
  purchase_date: string | null;
  sold_date: string | null;
  order_index: number;
  created_at: string;
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
      | 'notes'
      | 'photo_url'
      | 'photo_quality_status'
      | 'purchase_date'
      | 'sold_date'
      | 'order_index'
    >
  >;
