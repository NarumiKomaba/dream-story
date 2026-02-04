import { SymbolFacade } from 'symbol-sdk/symbol';
import { KeyPair } from 'symbol-sdk/symbol';
import { PrivateKey } from 'symbol-sdk';

const NODE_URL = 'https://sym-test-03.opening-line.jp:3001'; // HTTPS usually 3001
const EPOCH_ADJUSTMENT = 1637848847; // Testnet epoch
const GENERATION_HASH_SEED = '49D6E1CE276A85B70EAFE52349AACCA389302E7A9754BCF1221E79494FC665A4'; // Testnet

export class SymbolService {
    private facade: SymbolFacade;

    constructor() {
        this.facade = new SymbolFacade('testnet');
    }

    // Generate a new temporary account
    createAccount() {
        const keyPair = new KeyPair(PrivateKey.random());
        return {
            privateKey: keyPair.privateKey.toString(),
            publicKey: keyPair.publicKey.toString(),
            address: this.facade.network.publicKeyToAddress(keyPair.publicKey).toString(),
        };
    }

    // Send a dream record transaction
    async recordDream(privateKeyStr: string, dreamContent: string, analysisResult: any) {
        const privateKey = new PrivateKey(privateKeyStr);
        const keyPair = new KeyPair(privateKey);
        const signerPublicKey = keyPair.publicKey;
        const address = this.facade.network.publicKeyToAddress(signerPublicKey);

        const payload = JSON.stringify({
            type: 'dream_log',
            content: dreamContent.slice(0, 800),
            analysis: analysisResult,
            timestamp: Date.now()
        });

        const message = new TextEncoder().encode(payload);

        const transaction = this.facade.transactionFactory.create({
            type: 'transfer_transaction_v1',
            signerPublicKey: signerPublicKey.toString(),
            recipientAddress: address.toString(), // Self-transfer
            mosaics: [],
            message: message,
            deadline: this.createDeadline(),
        });

        const signature = this.facade.sign(transaction, keyPair);
        const jsonPayload = this.facade.transactionFactory.static.attachSignature(transaction, signature);

        try {
            const response = await fetch(`${NODE_URL}/transactions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: jsonPayload,
            });
            const responseData = await response.json();
            return { hash: this.facade.hash(transaction, signature).toString(), response: responseData };
        } catch (error) {
            console.error('Announcement failed', error);
            throw error;
        }
    }

    private createDeadline() {
        return BigInt(Date.now() + 7200000 - EPOCH_ADJUSTMENT * 1000);
    }
}

export const symbolService = new SymbolService();
