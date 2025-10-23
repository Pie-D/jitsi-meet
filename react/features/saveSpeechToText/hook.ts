import SaveSpeechToTextButton from "./components/web/SaveSpeechToTextButton";

const saveSpeechToText = {
    key: 'saveSpeechToText',
    Content: SaveSpeechToTextButton,
    group: 2
};

export function useSaveSpeechToTextButton() {
    return saveSpeechToText
}