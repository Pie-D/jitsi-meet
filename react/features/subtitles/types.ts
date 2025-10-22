import { IGroupableMessage } from '../base/util/messageGrouping';

export interface ITranscriptMessage {
    clearTimeOut?: number;
    final?: string;
    participant: {
        avatarUrl?: string;
        id?: string;
        name?: string;
    };
    stable?: string;
    unstable?: string;
}

export interface ISubtitle extends IGroupableMessage {
    id: string;
    interim?: boolean;
    isTranscription?: boolean;
    language?: string;
    participantId: string;
    participantName?: string; // thêm tên để hiển thị
    text: string;
    timestamp: number;
}
