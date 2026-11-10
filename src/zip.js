// Lazy, read-only ZIP access. Files remain Blobs; archives are never extracted to disk.
const ZIP_LIMITS={archive:1024*1024*1024,entry:128*1024*1024,directory:32*1024*1024,entries:50000};
const ZIP_CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function zipCRC32(bytes){let crc=0xffffffff;for(const b of bytes)crc=ZIP_CRC_TABLE[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zipSafePath(value){const path=String(value).replaceAll('\\','/');if(!path||path.startsWith('/')||/^[a-z]:/i.test(path)||path.includes('\0')||path.split('/').some(p=>p==='..'))throw new Error('Unsafe path in ZIP archive.');return path.split('/').filter(p=>p&&p!=='.').join('/');}
const ZIP_MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav',mp4:'video/mp4',json:'application/json',xml:'application/xml'};
async function zipReadLimited(stream,limit){const reader=stream.getReader(),chunks=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new Error('ZIP entry expands beyond its declared size.');}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;}
export class ZipArchive {
  constructor(blob){this.blob=blob;this.entries=new Map();this.casePaths=new Map();this.urls=new Map();this.jsonCache=new Map();}
  static async open(blob){
    if(!(blob instanceof Blob))throw new Error('Choose a ZIP or FNFC file.');if(blob.size>ZIP_LIMITS.archive)throw new Error('This ZIP is larger than the 1 GiB browser import limit.');
    const zip=new ZipArchive(blob),tailStart=Math.max(0,blob.size-65557),tail=new Uint8Array(await blob.slice(tailStart).arrayBuffer()),view=new DataView(tail.buffer);let end=-1;
    for(let i=tail.length-22;i>=0;i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)<=tail.length){end=i;break;}
    if(end<0)throw new Error('This file is not a complete ZIP archive.');if(view.getUint16(end+4,true)||view.getUint16(end+6,true))throw new Error('Multi-part ZIP archives are not supported.');
    let count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
    if(count===65535||size===0xffffffff||offset===0xffffffff){const locatorOffset=tailStart+end-20;if(locatorOffset<0)throw new Error('Invalid ZIP64 archive.');const locator=new DataView(await blob.slice(locatorOffset,locatorOffset+20).arrayBuffer());if(locator.getUint32(0,true)!==0x07064b50)throw new Error('ZIP64 directory is missing.');const recordOffset=Number(locator.getBigUint64(8,true)),record=new DataView(await blob.slice(recordOffset,recordOffset+56).arrayBuffer());if(record.getUint32(0,true)!==0x06064b50)throw new Error('Invalid ZIP64 directory.');count=Number(record.getBigUint64(32,true));size=Number(record.getBigUint64(40,true));offset=Number(record.getBigUint64(48,true));}
    if(!Number.isSafeInteger(offset)||count>ZIP_LIMITS.entries||size>ZIP_LIMITS.directory||offset+size>blob.size)throw new Error('ZIP directory is too large or invalid.');
    const directory=new Uint8Array(await blob.slice(offset,offset+size).arrayBuffer()),dv=new DataView(directory.buffer),decoder=new TextDecoder();zip.signature=zipCRC32(directory).toString(16)+'-'+blob.size;
    let cursor=0;for(let n=0;n<count;n++){
      if(cursor+46>directory.length||dv.getUint32(cursor,true)!==0x02014b50)throw new Error('Corrupt ZIP directory.');const flags=dv.getUint16(cursor+8,true),method=dv.getUint16(cursor+10,true),crc=dv.getUint32(cursor+16,true),nameLength=dv.getUint16(cursor+28,true),extraLength=dv.getUint16(cursor+30,true),commentLength=dv.getUint16(cursor+32,true);let compressed=dv.getUint32(cursor+20,true),uncompressed=dv.getUint32(cursor+24,true),local=dv.getUint32(cursor+42,true);const extraStart=cursor+46+nameLength,extraEnd=extraStart+extraLength;if(extraEnd+commentLength>directory.length)throw new Error('Corrupt ZIP filename.');
      if(compressed===0xffffffff||uncompressed===0xffffffff||local===0xffffffff){let p=extraStart;while(p+4<=extraEnd){const id=dv.getUint16(p,true),len=dv.getUint16(p+2,true);p+=4;if(id===1){let q=p;if(uncompressed===0xffffffff){uncompressed=Number(dv.getBigUint64(q,true));q+=8;}if(compressed===0xffffffff){compressed=Number(dv.getBigUint64(q,true));q+=8;}if(local===0xffffffff)local=Number(dv.getBigUint64(q,true));break;}p+=len;}}
      const original=decoder.decode(directory.subarray(cursor+46,cursor+46+nameLength)),path=zipSafePath(original);cursor=extraEnd+commentLength;if(original.endsWith('/'))continue;if(flags&1)throw new Error('Encrypted ZIP entries are not supported.');if(uncompressed>ZIP_LIMITS.entry||local+compressed>blob.size)throw new Error(`ZIP entry is too large or invalid: ${path}`);if(zip.casePaths.has(path.toLowerCase()))throw new Error(`ZIP contains duplicate file paths: ${path}`);
      zip.entries.set(path,{path,method,flags,crc,compressed,uncompressed,local});zip.casePaths.set(path.toLowerCase(),path);
    }
    return zip;
  }
  find(path){return this.casePaths.get(String(path).replaceAll('\\','/').toLowerCase())||null;}
  suffix(path){const ending=String(path).toLowerCase();return [...this.entries.keys()].find(p=>p.toLowerCase().endsWith(ending))||null;}
  async bytes(path,{max=ZIP_LIMITS.entry}={}){
    path=this.find(path)||path;const entry=this.entries.get(path);if(!entry)throw new Error('Missing ZIP asset: '+path);if(entry.uncompressed>max)throw new Error('ZIP asset is too large: '+path);const local=new DataView(await this.blob.slice(entry.local,entry.local+30).arrayBuffer());if(local.getUint32(0,true)!==0x04034b50)throw new Error('Invalid ZIP entry header.');const start=entry.local+30+local.getUint16(26,true)+local.getUint16(28,true),compressed=this.blob.slice(start,start+entry.compressed);let data;
    if(entry.method===0)data=new Uint8Array(await compressed.arrayBuffer());else if(entry.method===8){let inflater;try{inflater=new DecompressionStream('deflate-raw');}catch{throw new Error('This browser cannot decompress this ZIP. Use an updated Chromium, Firefox or Safari browser.');}data=await zipReadLimited(compressed.stream().pipeThrough(inflater),Math.min(max,entry.uncompressed));}else throw new Error(`Unsupported ZIP compression method ${entry.method}.`);
    if(data.length!==entry.uncompressed||zipCRC32(data)!==entry.crc)throw new Error('ZIP integrity check failed: '+path);return data;
  }
  async json(path){if(!this.jsonCache.has(path))this.jsonCache.set(path,this.bytes(path,{max:16*1024*1024}).then(bytes=>JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/,'').replace(/\0+$/,''))));return this.jsonCache.get(path);}
  async text(path){return new TextDecoder().decode(await this.bytes(path,{max:16*1024*1024}));}
  async url(path){const actual=this.find(path)||path;if(!this.urls.has(actual)){const bytes=await this.bytes(actual),ext=actual.split('.').at(-1).toLowerCase();this.urls.set(actual,URL.createObjectURL(new Blob([bytes],{type:ZIP_MIME[ext]||'application/octet-stream'})));}return this.urls.get(actual);}
  dispose(){for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();this.jsonCache.clear();}
}
