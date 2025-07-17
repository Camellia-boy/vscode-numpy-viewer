
import * as fs from 'fs';

class DataViewReader {
    offset: number = 0;
    constructor(public dataView: DataView) {
      this.dataView = dataView;
    }
  
    /* Variable length accessors */
  
    readBytes(length: number) {
      const buffer = new DataView(this.dataView.buffer, this.offset, length);
      this.offset += length;
      return buffer;
    }
  
    readAndASCIIDecodeBytes(length: number) {
      const array = new Uint8Array(this.dataView.buffer, this.offset, length);
      this.offset += length;
      return this._decodeASCIIByteArray(array);
    }
  
    /* Fixed length accessors */
  
    readUint8() {
      const value = this.dataView.getUint8(this.offset);
      this.offset += Uint8Array.BYTES_PER_ELEMENT;
      return value;
    }
  
    readUint16(littleEndian = false) {
      const value = this.dataView.getUint16(this.offset, littleEndian);
      this.offset += Uint16Array.BYTES_PER_ELEMENT;
      return value;
    }
  
    readUint32(littleEndian = false) {
      const value = this.dataView.getUint32(this.offset, littleEndian);
      this.offset += Uint32Array.BYTES_PER_ELEMENT;
      return value;
    }
  
    readBigUInt64(littleEndian = false) {
      const value = this.dataView.getBigUint64(this.offset, littleEndian);
      this.offset += BigUint64Array.BYTES_PER_ELEMENT;
      return value;
    }
    /* Helpers */
  
    _decodeASCIIByteArray(array: any) {
      const characters = [];
      for (const byte of array) {
        const char = String.fromCharCode(byte);
        characters.push(char);
      }
      return characters.join('');
    }
  }

interface Tensor {
    data: DataView;
    shape: number[];
    dtype: string;
}

export function fromArrayBuffer(buffer: ArrayBuffer) {
    const reader = new DataViewReader(new DataView(buffer));
    const headerLength = reader.readBigUInt64(true);
    const headerStr = reader.readAndASCIIDecodeBytes(Number(headerLength));
    const header = JSON.parse(headerStr);
    
    const data: {[key: string]: Tensor} = {};
    for (const key in header) {
        if (key === '__metadata__') {
            continue;
        }
        const tensorInfo = header[key];
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { dtype, shape, data_offsets } = tensorInfo;
        const [start, end] = data_offsets;
        const tensorData = new DataView(buffer, reader.offset + start, end - start);
        data[key] = {
            data: tensorData,
            shape: shape,
            dtype: dtype
        };
    }
    return data;
}
