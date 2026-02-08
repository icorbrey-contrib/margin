export interface UserProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  website?: string;
  links?: string[];
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

export interface Selector {
  type?: string;
  exact: string;
  prefix?: string;
  suffix?: string;
  start?: number;
  end?: number;
}

export interface Target {
  source: string;
  title?: string;
  selector?: Selector;
}

export interface AnnotationBody {
  type: "TextualBody";
  value: string;
  format: "text/plain";
}

export interface Param {
  id: string;
  value: string;
}

export interface AnnotationItem {
  uri: string;
  id?: string;
  cid: string;
  author: UserProfile;
  creator?: UserProfile;
  target?: Target;
  source?: string;
  body?: AnnotationBody;
  motivation: "highlighting" | "commenting" | "bookmarking" | string;
  type?: string;
  createdAt: string;
  text?: string;
  title?: string;
  description?: string;
  color?: string;
  tags?: string[];
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  children?: AnnotationItem[];
  viewer?: {
    like?: string;
  };
  collection?: {
    uri: string;
    name: string;
    icon?: string;
  };
  addedBy?: UserProfile;
  collectionItemUri?: string;
  reply?: {
    parent?: {
      uri: string;
      cid: string;
    };
    root?: {
      uri: string;
      cid: string;
    };
  };
  parentUri?: string;
}

export type ActorSearchItem = UserProfile;

export interface FeedResponse {
  cursor?: string;
  items: AnnotationItem[];
}

export interface NotificationItem {
  id: number;
  recipient: UserProfile;
  actor: UserProfile;
  type:
    | "reply"
    | "quote"
    | "highlight"
    | "bookmark"
    | "annotation"
    | "like"
    | "follow";
  subjectUri: string;
  subject?: AnnotationItem | unknown;
  createdAt: string;
  readAt?: string;
}

export interface Collection {
  id: string;
  uri: string;
  name: string;
  description?: string;
  icon?: string;
  creator: UserProfile;
  createdAt: string;
  itemCount: number;
  items?: AnnotationItem[];
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  subjectUri: string;
  createdAt: string;
  annotation?: AnnotationItem;
}

export interface EditHistoryItem {
  uri: string;
  cid: string;
  author: UserProfile;
  text: string;
  createdAt: string;
}
