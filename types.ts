
export interface Translation {
  [key: string]: string;
}

export interface Translations {
  en: Translation;
  ar: Translation;
}

export interface Service {
  icon: string;
  title: { en: string; ar: string };
  desc: { en: string; ar: string };
}

export interface Project {
  title: { en: string; ar: string };
  category: { en: string; ar: string };
  description: { en: string; ar: string };
  link: string;
  image: string;
  problem: { en: string; ar: string };
  solution: { en: string; ar: string };
  visuals: { type: 'image' | 'video'; url: string; }[];
  results: { value: string; label: { en: string; ar: string } }[];
  testimonial: { text: { en: string; ar: string }; author: { en: string; ar: string } };
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorEmail: string;
  title: string;
  description: string;
  type: 'Project' | 'Course' | 'Workshop';
  isPaid: boolean;
  price: number;
  isApproved: boolean;
  createdAt: string;
  downloadLink?: string;
}

export interface ConsultationResponse {
  problemAnalysis: string;
  proposedSolution: string;
  suggestedServices: string[];
}

export interface SavedConversation {
  id: string;
  userId: string;
  type: 'consultation' | 'brainstorm';
  userInput: string;
  aiResponse: string | ConsultationResponse;
  createdAt: string;
  serviceTitle?: string; // for brainstorms
}

export interface PurchaseRecord {
    id: string;
    userId: string;
    postId: string;
    postTitle: string;
    price: number;
    purchasedAt: string;
    licenseKey?: string;
}
