export class Shorten {
    public static shorten(text: string, partialLength: number): string {
        const charLenth = partialLength * 2;
        if (text.length <= charLenth) return text;
        return text.substr(0, partialLength) + ".." + text.substr(text.length - partialLength, text.length);
    }
}
