// Lectura local de CSV, TSV y XLSX (sin enviar el archivo a servicios de terceros).
const utf8 = new TextDecoder('utf-8');
const dec = bytes => utf8.decode(bytes);
function readCsv(text) {
  text=text.replace(/^\uFEFF/,'');
  const first=text.slice(0,2000).split(/\r?\n/)[0]||'';
  const delimiter=['\t',';',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const out=[];let row=[],field='',quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quote&&text[i+1]==='"'){field+='"';i++}else quote=!quote;
    }else if(!quote&&c===delimiter){row.push(field);field=''}
    else if(!quote&&(c==='\n'||c==='\r')){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(field);if(row.some(v=>String(v).trim()))out.push(row);row=[];field='';
    }else field+=c;
  }
  row.push(field);if(row.some(v=>String(v).trim()))out.push(row);
  return out;
}
const u16=(dv,p)=>dv.getUint16(p,true),u32=(dv,p)=>dv.getUint32(p,true);
function getZipDirectory(buffer){
 const dv=new DataView(buffer),bytes=new Uint8Array(buffer);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--){if(u32(dv,i)===0x06054b50){end=i;break}}
 if(end<0)throw Error('Excel inválido (archivo ZIP incompleto).');
 const n=u16(dv,end+10),start=u32(dv,end+16),items=new Map();let p=start;
 if(n>5000)throw Error('Archivo Excel demasiado complejo.');
 for(let i=0;i<n;i++){
  if(u32(dv,p)!==0x02014b50)throw Error('Estructura interna de Excel inválida.');
  const method=u16(dv,p+10),size=u32(dv,p+20),nlen=u16(dv,p+28),elen=u16(dv,p+30),clen=u16(dv,p+32),offset=u32(dv,p+42),name=dec(bytes.subarray(p+46,p+46+nlen));
  items.set(name,{method,size,offset});p+=46+nlen+elen+clen;
 }
 return {dv,bytes,items};
}
async function zipFile(zip,name){
 const file=zip.items.get(name);if(!file)throw Error('No se encontró '+name+' dentro del Excel.');
 const {dv,bytes}=zip,p=file.offset;
 if(u32(dv,p)!==0x04034b50)throw Error('Cabecera ZIP inválida.');
 const dataStart=p+30+u16(dv,p+26)+u16(dv,p+28);
 const compressed=bytes.slice(dataStart,dataStart+file.size);
 if(file.method===0)return dec(compressed);
 if(file.method!==8)throw Error('El archivo Excel está comprimido con un formato no compatible.');
 try{
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return dec(new Uint8Array(await new Response(stream).arrayBuffer()));
 }catch(_){throw Error('Este navegador no puede abrir este Excel. Abre el archivo en Excel y guárdalo como CSV UTF-8.');}
}
function xmlDoc(xml){const d=new DOMParser().parseFromString(xml,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('Contenido XML incorrecto en el Excel.');return d}
function descendants(node,tag){return Array.from(node.getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main',tag))}
function cellColumn(ref){let n=0;for(const char of String(ref||'').match(/^[A-Za-z]+/)?.[0]?.toUpperCase()||''){n=n*26+char.charCodeAt(0)-64}return n-1}
function normalizeWorksheetLocation(rel){const raw=String(rel||'').replace(/^\//,'');if(raw.startsWith('xl/'))return raw;const parts=['xl'];for(const piece of raw.split('/')){if(piece==='..')parts.pop();else if(piece&&piece!=='.')parts.push(piece)}return parts.join('/')}
async function readXlsx(buffer){
 const zip=getZipDirectory(buffer);
 const workbook=xmlDoc(await zipFile(zip,'xl/workbook.xml'));
 const sheets=descendants(workbook,'sheet');if(!sheets.length)throw Error('Excel sin hojas.');
 const rid=sheets[0].getAttribute('r:id')||sheets[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
 let path='xl/worksheets/sheet1.xml';
 if(zip.items.has('xl/_rels/workbook.xml.rels')){
  const rels=xmlDoc(await zipFile(zip,'xl/_rels/workbook.xml.rels'));
  const rel=Array.from(rels.getElementsByTagName('*')).find(el=>el.localName==='Relationship'&&el.getAttribute('Id')===rid);
  if(rel)path=normalizeWorksheetLocation(rel.getAttribute('Target'));
 }
 let strings=[];
 if(zip.items.has('xl/sharedStrings.xml')){
  strings=descendants(xmlDoc(await zipFile(zip,'xl/sharedStrings.xml')),'si').map(si=>descendants(si,'t').map(t=>t.textContent||'').join(''));
 }
 const sheet=xmlDoc(await zipFile(zip,path));const data=descendants(sheet,'sheetData')[0];if(!data)throw Error('La primera hoja está vacía.');
 const rows=[];
 for(const r of descendants(data,'row')){
  const cells=[];
  for(const c of descendants(r,'c')){
   const idx=cellColumn(c.getAttribute('r'));
   if(idx<0||idx>200)continue;
   const type=c.getAttribute('t');let value='';
   if(type==='inlineStr')value=descendants(c,'t').map(t=>t.textContent||'').join('');
   else {const v=descendants(c,'v')[0]?.textContent||'';value=type==='s'?strings[Number(v)]||'':v;}
   cells[idx]=value;
  }
  rows.push(cells);
  if(rows.length>2500)throw Error('Máximo 2.000 preparaciones por archivo. Divide el archivo por mes.');
 }
 return rows;
}
export async function readPreparationFile(file){
 if(!file||file.size>8*1024*1024)throw Error('Selecciona un archivo Excel/CSV de máximo 8 MB.');
 const bytes=await file.arrayBuffer();const ext=(file.name.split('.').pop()||'').toLowerCase();
 let rows;
 if(ext==='xlsx')rows=await readXlsx(bytes);
 else if(ext==='csv'||ext==='txt'||ext==='tsv')rows=readCsv(dec(new Uint8Array(bytes)));
 else throw Error('Usa un archivo .xlsx, .csv o .tsv.');
 const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const sha=Array.from(hashBytes).map(x=>x.toString(16).padStart(2,'0')).join('');
 return {rows,sha};
}
