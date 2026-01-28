declare module 'crypto-js' {
  export interface WordArray {
    toString(encoder?: any): string;
  }

  export namespace AES {
    function encrypt(message: string, key: string): WordArray;
    function decrypt(ciphertext: string | WordArray, key: string): WordArray;
  }

  export function SHA256(message: string): WordArray;

  export namespace enc {
    const Utf8: any;
  }
}
