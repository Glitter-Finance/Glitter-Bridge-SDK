/**
 * Converts an array of bytes to a hexadecimal string.
 * @param {number[]} bytes - The array of bytes to convert.
 * @returns {string} The hexadecimal string representation of the bytes.
 */
export const toHexString = (bytes: any[]) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

/**
 * Converts a hexadecimal string to a Uint8Array.
 * @param {string} hexString - The hexadecimal string to convert.
 * @returns {Uint8Array} The Uint8Array representation of the hexadecimal string.
 */
export const fromHexString = (hexString: string): Uint8Array => {
    const match = hexString.match(/.{1,2}/g);
    if (match) {
        return Uint8Array.from(match.map((byte) => parseInt(byte, 16)));
    } else {
        return Uint8Array.from([]);
    }
};
