export interface IFileMetadata {
    authorParticipantId: string;
    authorParticipantJid: string;
    authorParticipantName: string;
    conferenceFullName: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    isDeleted?: boolean;
    isRocketChatFile?: boolean;
    progress?: number;
    timestamp: number;
    url?: string;
}
