import algosdk from "algosdk";

/**
 * Converts a string to ASCII representation.
 *
 * @param {string} str - The string to convert.
 * @returns {string} - The ASCII representation of the string.
 */
export const convertToAscii = (str: string) => {
    const arg = Buffer.from(str, "base64").toString("ascii");
    return arg;
};

/**
 * Converts a value to a number.
 *
 * @param {*} str - The value to convert to a number.
 * @returns {number} - The converted number value.
 */
export const convertToNumber = (str: any) => {
    if (typeof str !== "number") {
        str = Buffer.from(str, "base64");
        return Number(algosdk.decodeUint64(str, "safe"));
    } else {
        return Number(str);
    }
};
