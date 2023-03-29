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
            return (
                t.network.toLowerCase() === network.toLowerCase() &&
        t.symbol.toLowerCase() === symbol.toLowerCase()
            );
        });
    }

    public static add(...args: [token: BridgeToken]) {
    //Check if already exists
        const existing = this.get(args[0].network, args[0].symbol);
        if (existing === undefined) {
            this._tokens.push(args[0]);
        }
    }
}
