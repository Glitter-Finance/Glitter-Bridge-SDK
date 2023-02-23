export enum EvmError {
    CLIENT_NOT_SET = 'Evm client has not been set',
    BRIDGE_NOT_SET = 'Evm bridge has not been set',
    INVALID_ASSET = '[EvmConnect] Can not provide address of undefined token.',
    INVALID_ASSET_ID ='[EvmConnect] Please provide token symbol.',
    ASSET_NOT_SUPPORTED ="[EvmConnect] Unsupported token symbol.",
    INVALID_DESTINATION = "[EvmConnect] Cannot transfer tokens to same chain.",
    NOT_SERIALIZABLE ="[SerializeEvmBridgeTransfer] Unable to serialize bridge transfer networks",
    NOT_DESERILIZABLE = "[DeserializeEvmBridgeTransfer] Unable to deserialize bridge transfer networks",
    INVALID_ASSET_ID_TYPE ='Asset id type should be a string',
    UNDEFINED_TRANSACTION = 'Undefined transaction',
    INVALID_SIGNER ='Signer is required',
    MISSING_SECRET_KEY =' Signers secret key is required',
    UNDEFINED_ACCOUNTS ='Accounts not defined',
    TIMEOUT ='Timeout- waiting for balance',
    POLLER_NOT_SET='Evm poller has not been set',
    INVALID_MNEMONIC ='Invalid mnemonic',
    ACCOUNT_INFO ='Account info not found',
    INVALID_ACCOUNT ='Account is undefined',
    ACCOUNTS_NOT_SET ='Evm accounts are not set',
    ASSETS_NOT_SET ='Evm assets are not set',
    UNDEFINED_TOKEN_ACCOUNT ='Token account not found',
    UNDEFINED_ROUTING ='Routing has not been set'

  }

