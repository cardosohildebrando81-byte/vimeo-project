// Enums do banco de dados
export type Role = 'CLIENT' | 'MANAGER' | 'ADMIN';
export type ExportFormat = 'XLSX' | 'DOCX';
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Tabelas do banco
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  organizationId: string;
  authProvider: string;
  authProviderId: string;
  email: string;
  password: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  organizationId: string;
  vimeoId: string;
  code: string;
  title: string;
  description?: string;
  durationSec?: number;
  url: string;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Specialty {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoCategory {
  videoId: string;
  categoryId: string;
}

export interface VideoSpecialty {
  videoId: string;
  specialtyId: string;
}

export interface VideoList {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoListItem {
  id: string;
  videoListId: string;
  videoId: string;
  orderIndex: number;
  addedAt: Date;
}

export interface SelectionSession {
  id: string;
  organizationId: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectionItem {
  id: string;
  selectionSessionId: string;
  videoId: string;
  addedAt: Date;
}

export interface ExportJob {
  id: string;
  organizationId: string;
  videoListId: string;
  requestedById: string;
  format: ExportFormat;
  status: ExportStatus;
  fileUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AnalyticsEvent {
  id: string;
  organizationId: string;
  userId?: string;
  type: string;
  refId?: string;
  payload?: Record<string, any>;
  createdAt: Date;
}

// Types para queries com joins
export interface VideoWithDetails extends Video {
  categories?: Category[];
  specialties?: Specialty[];
}

export interface VideoListWithItems extends VideoList {
  items?: VideoListItem[];
  videos?: Video[];
}

export interface SelectionSessionWithItems extends SelectionSession {
  items?: SelectionItem[];
  videos?: Video[];
}
