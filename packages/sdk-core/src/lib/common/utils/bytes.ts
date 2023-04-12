export const toHexString = (bytes: any[]) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

export const fromHexString = (hexString: string): Uint8Array => {
    const match = hexString.match(/.{1,2}/g);
    if (match) {
        return Uint8Array.from(match.map((byte) => parseInt(byte, 16)));
    } else {
        return Uint8Array.from([]);
    }
};
