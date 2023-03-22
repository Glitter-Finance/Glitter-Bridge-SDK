import algosdk from "algosdk";

export const convertToAscii = (str: string) => {
    const arg = Buffer.from(str, "base64").toString("ascii");
    return arg;
};
export const convertToNumber = (str: any) => {
    if (typeof str !== "number") {
        str = Buffer.from(str, "base64");
        return Number(algosdk.decodeUint64(str, "safe"));
    } else {
        return Number(str);
    }
};
