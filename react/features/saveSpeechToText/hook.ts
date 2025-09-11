import SaveSpeechToTextButton from "./components/web/SaveSpeechToTextButton";

const saveSpeechToText = {
    key: 'saveSpeechToText',
    Content: SaveSpeechToTextButton,
    group: 5
};

export function useSaveSpeechToTextButton() {
    return saveSpeechToText
}