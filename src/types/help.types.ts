import type { HelpCompany, HelpVideo, VideoCategory } from "@/lib/customer/helpPage";

// Admin › Settings › Company and help page, and Video guides (admin/help).
export type IHelpCompany = HelpCompany;
export type IHelpVideo = HelpVideo;
export type IHelpVideoCategory = VideoCategory;

export interface IAdminHelp {
  company: IHelpCompany;
  videos: IHelpVideo[];
}

export type IUpdateHelpCompanyPayload = Partial<IHelpCompany>;

export interface IHelpVideoPayload {
  titleEn: string;
  titleBn?: string;
  category: IHelpVideoCategory;
  minutes: number;
  // Any YouTube link (watch, youtu.be, shorts, embed) or the bare id.
  youtube: string;
  shown?: boolean;
}
