module zaeon_addr::pro_card {
    use std::string::{Self, String};
    use std::signer;
    use std::option;

    // O módulo correto para NFTs no endereço 0x4 é 'token'
    use aptos_token_objects::collection;
    use aptos_token_objects::token;

    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    const PRO_CARD_PRICE: u64 = 33300000000;
    const TREASURY_ADDR: address = @zaeon_addr;
    const EINSUFFICIENT_BALANCE: u64 = 1;

    fun init_module(admin: &signer) {
        // Criando a coleção com 6 argumentos obrigatórios
        collection::create_fixed_collection(
            admin,
            string::utf8(b"Elite Access for Zaeon Station"),
            10000, // max_supply
            string::utf8(b"Zaeon Pro Cards"),
            option::none(), // Royalty
            string::utf8(b"https://zaeon.ai/assets/pro-card-metadata.json"),
        );
    }

    public entry fun purchase_pro_card(user: &signer) {
        let user_addr = signer::address_of(user);
        let balance = coin::balance<AptosCoin>(user_addr);

        assert!(balance >= PRO_CARD_PRICE, EINSUFFICIENT_BALANCE);

        coin::transfer<AptosCoin>(user, TREASURY_ADDR, PRO_CARD_PRICE);

        // O padrão DAS usa 'create_named_token' com 6 argumentos
        // Capturamos o retorno para satisfazer a segurança do Move
        let _constructor_ref = token::create_named_token(
            user,
            string::utf8(b"Zaeon Pro Cards"), // Collection name
            string::utf8(b"Premium access to Zaeon AI Neural Core"), // Description
            string::utf8(b"Zaeon Pro Card"), // Token name
            option::none(), // Royalty
            string::utf8(b"https://zaeon.ai/assets/pro-card-visual.png"), // URI
        );
    }

    #[view]
    public fun get_price(): u64 {
        PRO_CARD_PRICE
    }
}