"use client";

import { useEffect, useState } from "react";
import { WepinWidgetSDK } from "@wepin/widget-sdk";
import { WepinProvider } from "@wepin/provider"; // Allows EVM connection
import { ethers } from "ethers";

// --- VERY CHAIN CONFIGURATION ---
// REPLACE THESE WITH OFFICIAL TESTNET DETAILS
const VERY_TESTNET_CONFIG = {
    chainId: 4614, // Placeholder: Verify this!
    chainName: "VERY Blockchain Testnet",
    rpcUrls: ["https://rpc-testnet.verylabs.io"], // Placeholder
    nativeCurrency: {
        name: "VERY",
        symbol: "VERY",
        decimals: 18,
    },
    blockExplorerUrls: ["https://testnet.veryscan.io"], // Placeholder
};

// --- WEPIN CONFIGURATION ---
// Get these from Wepin Workspace: https://workspace.wepin.io/
const WEPIN_APP_ID = "YOUR_WEPIN_APP_ID";
const WEPIN_APP_KEY = "YOUR_WEPIN_APP_KEY";

export const useWepin = () => {
    const [wepin, setWepin] = useState<WepinWidgetSDK | null>(null);
    const [provider, setProvider] = useState<any>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initWepin = async () => {
            try {
                const wepinInstance = new WepinWidgetSDK({
                    appId: WEPIN_APP_ID,
                    appKey: WEPIN_APP_KEY,
                });

                await wepinInstance.init();
                setWepin(wepinInstance);
                setIsReady(true);

                // Check if already logged in
                if (await wepinInstance.isInitialized()) {
                    const accounts = await wepinInstance.getAccounts();
                    if (accounts && accounts.length > 0) {
                        setAccount(accounts[0].address);
                    }
                }

            } catch (error) {
                console.error("Failed to initialize Wepin:", error);
            }
        };

        if (!wepin) {
            initWepin();
        }
    }, [wepin]);

    const connect = async () => {
        if (!wepin || !isReady) return;

        try {
            // 1. Open Widget & Login
            await wepin.openWidget();

            // 2. Get Accounts (Wepin manages the private key)
            const accounts = await wepin.getAccounts();
            if (!accounts || accounts.length === 0) throw new Error("No accounts found");

            const userAccount = accounts[0].address;
            setAccount(userAccount);

            // 3. Initialize Provider for VERY Chain
            // WepinProvider acts as an EIP-1193 provider (like window.ethereum)
            const wepinProvider = new WepinProvider({
                wepin: wepin,
                network: 'evm' // Assuming VERY is EVM compatible
            });

            // 4. Switch/Add VERY Network
            // Note: Wepin might handle network switching internally via its widget,
            // but standard EIP-3326 requests can be sent via the provider.
            try {
                await wepinProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${VERY_TESTNET_CONFIG.chainId.toString(16)}` }],
                });
            } catch (switchError: any) {
                // This error code indicates that the chain has not been added to the wallet.
                if (switchError.code === 4902) {
                    await wepinProvider.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: `0x${VERY_TESTNET_CONFIG.chainId.toString(16)}`,
                                chainName: VERY_TESTNET_CONFIG.chainName,
                                rpcUrls: VERY_TESTNET_CONFIG.rpcUrls,
                                nativeCurrency: VERY_TESTNET_CONFIG.nativeCurrency,
                                blockExplorerUrls: VERY_TESTNET_CONFIG.blockExplorerUrls,
                            },
                        ],
                    });
                }
            }

            setProvider(new ethers.BrowserProvider(wepinProvider));

        } catch (error) {
            console.error("Connection failed:", error);
            alert("Failed to connect Wepin Wallet.");
        }
    };

    const logout = async () => {
        if (!wepin) return;
        await wepin.logout();
        setAccount(null);
        setProvider(null);
    };

    return { wepin, provider, account, connect, logout, isReady };
};