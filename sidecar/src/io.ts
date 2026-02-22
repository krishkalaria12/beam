import { Packr } from 'msgpackr';
import { deflate } from 'pako';

const packr = new Packr();
const COMPRESSION_THRESHOLD = 2048; // 2KB

export const writeOutput = (data: object): void => {
	try {
		const payload = packr.pack({ ...data, timestamp: Date.now() });

		let payloadToWrite: Uint8Array = payload;
		let isCompressed = false;

		if (payload.length > COMPRESSION_THRESHOLD) {
			const compressed = deflate(payload);
			if (compressed.length < payload.length) {
				payloadToWrite = compressed;
				isCompressed = true;
				writeLog(`Compressed payload from ${payload.length} to ${compressed.length} bytes`);
			}
		}

		const header = Buffer.alloc(4);
		let headerValue = payloadToWrite.length;
		if (isCompressed) {
			headerValue |= 0x80000000;
		}

		header.writeUInt32BE(headerValue >>> 0);

		process.stdout.write(header);
		process.stdout.write(payloadToWrite);
	} catch (e: unknown) {
		const errorString = e instanceof Error ? e.toString() : String(e);
		const errorPayload = packr.pack({ type: 'log', payload: errorString, timestamp: Date.now() });
		const errorHeader = Buffer.alloc(4);
		errorHeader.writeUInt32BE(errorPayload.length);
		process.stdout.write(errorHeader);
		process.stdout.write(errorPayload);
	}
};

export const writeLog = (message: unknown): void => {
	writeOutput({ type: 'log', payload: message });
};
