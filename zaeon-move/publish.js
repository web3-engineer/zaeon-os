const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, Hex } = require("@aptos-labs/ts-sdk");
const fs = require("fs");
const path = require("path");

const PRIVATE_KEY_STR = "0x3fdb890d03facd5dbbc781674913df95dbae400c9bcc209045d82291c8df2ffc";
const MOVEMENT_RPC = "https://aptos.testnet.m1.movementlabs.xyz/v1";

async function publish() {
    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: MOVEMENT_RPC });
    const aptos = new Aptos(config);
    const account = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(PRIVATE_KEY_STR) });

    console.log(`🚀 Iniciando deploy pela carteira: ${account.accountAddress.toString()}`);

    // Caminhos absolutos para os novos arquivos gerados
    const buildDir = path.join(__dirname, "build", "zaeon_pro_card");
    const metadataPath = path.join(buildDir, "package-metadata.bcs");
    const modulePath = path.join(buildDir, "bytecode_modules", "pro_card.mv");

    if (!fs.existsSync(metadataPath) || !fs.existsSync(modulePath)) {
        console.error("❌ Erro: Arquivos não encontrados após a limpeza. Verifique o comando compile.");
        return;
    }

    // Lendo e convertendo para o formato exato que a rede Movement aceita
    const metadataBytes = new Uint8Array(fs.readFileSync(metadataPath));
    const moduleBytes = new Uint8Array(fs.readFileSync(modulePath));

    console.log("📦 Construindo payload nativo para evitar erros de SDK...");

    try {
        // Usamos a função nativa da blockchain (0x1::code::publish_package_txn)
        const transaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: "0x1::code::publish_package_txn",
                functionArguments: [metadataBytes, [moduleBytes]],
            },
        });

        console.log("📝 Assinando transação...");
        const pendingTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction
        });

        console.log(`⏳ Transação enviada! Hash: ${pendingTxn.hash}`);
        const response = await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });

        if (response.success) {
            console.log("✅ CONTRATO PUBLICADO COM SUCESSO!");
            console.log(`Explorer: https://explorer.movementnetwork.xyz/txn/${pendingTxn.hash}?network=testnet`);
        } else {
            console.error("❌ Falha na execução (VM):", response.vm_status);
        }
    } catch (err) {
        console.error("❌ Erro no processo:");
        console.error(err.message);
    }
}

publish().catch(console.error);