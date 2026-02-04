"use server";

import { SymbolFacade } from 'symbol-sdk/symbol';
import { KeyPair } from 'symbol-sdk/symbol';
import { PrivateKey } from 'symbol-sdk';

const NODE_URL = process.env.SYMBOL_NODE_URL || 'https://sym-test-01.opening-line.jp:3001';
const PRIVATE_KEY = process.env.SYMBOL_PRIVATE_KEY;
const EPOCH_ADJUSTMENT = 1637848847; // Testnet 

export async function recordDreamOnChain(dreamContent: string, analysisResult: any) {
    if (!PRIVATE_KEY) {
        throw new Error("Server configuration error: SYMBOL_PRIVATE_KEY is missing.");
    }

    // Initialize Facade on Server
    const facade = new SymbolFacade('testnet');

    // Setup KeyPair from Env
    const privateKey = new PrivateKey(PRIVATE_KEY);
    const keyPair = new KeyPair(privateKey);
    const signerPublicKey = keyPair.publicKey;
    const address = facade.network.publicKeyToAddress(signerPublicKey);

    // Prepare Message
    const payload = JSON.stringify({
        type: 'dream_log',
        content: dreamContent.slice(0, 800), // Truncate
        analysis: analysisResult,
        timestamp: Date.now()
    });
    const message = new TextEncoder().encode(payload);

    // Create Deadline
    const deadline = BigInt(Date.now() + 7200000 - EPOCH_ADJUSTMENT * 1000);

    // Create Transaction
    const transaction = facade.transactionFactory.create({
        type: 'transfer_transaction_v1',
        signerPublicKey: signerPublicKey.toString(),
        recipientAddress: address.toString(), // Self-transfer (History)
        mosaics: [],
        message: message,
        deadline: deadline,
    });

    // Sign
    const signature = facade.sign(transaction, keyPair);
    const jsonPayload = facade.transactionFactory.static.attachSignature(transaction, signature);

    // Announce
    try {
        const response = await fetch(`${NODE_URL}/transactions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: jsonPayload,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Node error: ${response.status} ${text}`);
        }

        const responseData = await response.json();
        return {
            success: true,
            hash: facade.hash(transaction, signature).toString(),
            message: responseData.message
        };
    } catch (error: any) {
        console.error('Transaction failed:', error);
        return { success: false, error: error.message };
    }
}

import { aiService } from "@/services/ai";

export async function analyzeDreamAction(dreamContent: string) {
    try {
        const analysis = await aiService.analyzeDream(dreamContent);
        return { success: true, analysis };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function digDeeperAction(history: { role: "user" | "model", content: string }[]) {
    try {
        const question = await aiService.digDeeper(history);
        return { success: true, question };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
