// export enum TokenParams {
//     none = 0,
//     name = 1 << 1,
//     symbol = 1 << 2,
//     decimals = 1 << 3,
//     total_supply = 1 << 4,
//     min_transfer = 1 << 5,
//     max_transfer = 1 << 6,
//     fee_divisor = 1 << 7,
//     all = name | symbol | decimals | total_supply | min_transfer | max_transfer | fee_divisor
// }
// export type TokenConfig = {
//     approval_app: number;
//     assets_info: TokenInfo[];
//     loaded: boolean;
// }
// export type TokenInfo = {
//     network: string;
//     name: string;
//     symbol: string;
//     type: string;
//     asset_id: number | undefined;
//     bridge_vault_id: number | undefined;
//     decimals: number;
//     min_transfer: number | undefined;
//     max_transfer: number | undefined;
//     fee_divisor: number | undefined;
//     total_supply: bigint;
//     loaded: boolean;
// }
// export function initToken(options?: Partial<TokenInfo>): TokenInfo {
//     const defaults = {
//         network: "",
//         name: "",
//         symbol: "",
//         type: "",
//         asset_id: undefined,
//         bridge_vault_id: undefined,
//         decimals: 0,
//         min_transfer: undefined,
//         max_transfer: undefined,
//         fee_divisor: undefined,
//         total_supply: BigInt(0),
//         loaded: false
//     }
//     return {
//         ...defaults,
//         ...options,
//     };
// }

export type BridgeTokenConfig = {
    tokens: BridgeToken[];
};
export type BridgeToken = {
    symbol: string;
    network: string;
    address: string | number | undefined;
    decimals: number;
    name: string | undefined;
    fee_divisor?: number | undefined;
    min_transfer?: number | undefined;
    max_transfer?: number | undefined;
    total_supply?: bigint | undefined;
};
export function BridgeTokenDefault(): BridgeToken {
    return {
        symbol: "",
        network: "",
        address: undefined,
        decimals: 0,
        name: undefined,
        fee_divisor: undefined,
        min_transfer: undefined,
        max_transfer: undefined,
        total_supply: undefined,
    };
}

export class BridgeTokens {
    private static _tokens: BridgeToken[];

    public static loadConfig(tokens: BridgeToken[]) {
        if (tokens === undefined) {
            throw new Error("Tokens config not found");
        } else if (this._tokens === undefined) {
            this._tokens = tokens;
        } else {
            //Parse config tokens and add to list
            tokens.forEach((token) => {
                //check if token already exists
                const existing = this.get(token.network, token.symbol);
                if (existing !== undefined) {
                    return existing;
                }
            });
        }
    }

    public static get(network: string, symbol: string): BridgeToken | undefined {
        return this._tokens.find((t) => {
            if (!t.symbol || !t.network) return false;
            return t.network.toLowerCase() === network.toLowerCase() && t.symbol.toLowerCase() === symbol.toLowerCase();
        });
    }

    public static add(...args: [token: BridgeToken]) {
        //Check if already exists
        const existing = this.get(args[0].network, args[0].symbol);
        if (existing === undefined) {
            this._tokens.push(args[0]);
        }
    }

    // public static config: TokenConfig = {
    //     approval_app: 0,
    //     assets_info: [],
    //     loaded: false
    // };

    //Load/Save Config

    // //Get Token Info
    // public static getTokenInfo(network: string, symbol: string): TokenInfo | undefined {
    //     console.log(`matching: ${symbol.toLowerCase()} ${network.toLowerCase()}`);

    //     const tokens = BridgeTokens.config.assets_info;
    //     for (let i = 0; i < tokens.length; i++) {
    //         const token = tokens[i];
    //         if (token.network.toLowerCase() === network.toLowerCase() &&
    //             token.symbol.toLowerCase() === symbol.toLowerCase()) return token;
    //     }
    //     return undefined;
    // }

    // public static loadFromCli(requiredParams?: TokenParams): TokenInfo | undefined {

    //     const token = initToken();
    //     try {

    //         //parse params
    //         const argv = minimist(process.argv.slice(2));

    //         token.name = argv.name;
    //         token.decimals = argv.d;
    //         token.symbol = argv.s;
    //         if (argv.network) token.network = argv.network.toLowerCase();
    //         token.min_transfer = argv.min;
    //         token.max_transfer = argv.max;
    //         token.fee_divisor = argv.fee;

    //         const totalSupply = argv.t as string;
    //         token.total_supply = (!totalSupply ? BigInt(0) : BigInt(totalSupply));

    //         //ensure params are set
    //         if (requiredParams) {
    //             if ((requiredParams & TokenParams.name) === TokenParams.name) {
    //                 if (!token.name && token.name === undefined) throw new Error("Token Name is required");
    //             }
    //             if ((requiredParams & TokenParams.symbol) === TokenParams.symbol) {
    //                 if (!token.symbol && token.symbol === undefined) throw new Error("Asset Symbol is required");
    //             }
    //             if ((requiredParams & TokenParams.decimals) === TokenParams.decimals) {
    //                 if (!token.decimals && token.decimals === undefined) throw new Error("Decimals is required");
    //             }
    //             if ((requiredParams & TokenParams.total_supply) === TokenParams.total_supply) {
    //                 if (!token.total_supply && token.total_supply === undefined) throw new Error("Total Supply is required");
    //             }

    //             if ((requiredParams & TokenParams.min_transfer) === TokenParams.min_transfer) {
    //                 if (!token.min_transfer) {
    //                     throw new Error('Minimum Transfer not specified');
    //                 } else if (token.min_transfer <= 0) {
    //                     throw new Error('Minimum Transfer must be greater than 0');
    //                 }
    //             }

    //             if ((requiredParams & TokenParams.max_transfer) === TokenParams.max_transfer) {
    //                 if (!token.max_transfer) {
    //                     throw new Error('Maximum Transfer not specified');
    //                 } else if (token.max_transfer <= 0) {
    //                     throw new Error('Maximum Transfer must be greater than 0');
    //                 } else if (!token.min_transfer) {
    //                     throw new Error('Minimum Transfer not specified');
    //                 } else if (token.max_transfer <= token.min_transfer) {
    //                     throw new Error('Maximum Transfer must be greater than Minimum Transfer');
    //                 }
    //             }

    //             if ((requiredParams & TokenParams.fee_divisor) === TokenParams.fee_divisor) {
    //                 if (!token.fee_divisor) {
    //                     throw new Error('Fee Divisor not specified');
    //                 } else if (token.fee_divisor < 1) {
    //                     throw new Error('Fee Divisor must be greater than 1');
    //                 }
    //             }
    //         }

    //         //Passed All Checks:
    //         token.loaded = true;

    //     } catch (error) {
    //         console.log(error);
    //     }

    //     return token;
    // }
}
